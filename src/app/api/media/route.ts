import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ValidationError } from '@/lib/error-handler';

interface FileItem {
    id: string;
    name: string;
    type: 'image' | 'video' | 'document' | 'folder';
    url?: string;
    size?: number;
    parentId?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
    };
}

// Mock data for development
const mockFiles: FileItem[] = [
    {
        id: '1',
        name: '产品图片',
        type: 'folder',
        createdAt: '2025-01-10T10:00:00Z',
        updatedAt: '2025-01-10T10:00:00Z'
    },
    {
        id: '2',
        name: '营销素材',
        type: 'folder',
        createdAt: '2025-01-08T14:30:00Z',
        updatedAt: '2025-01-08T14:30:00Z'
    },
    {
        id: '3',
        name: 'logo.png',
        type: 'image',
        url: '/images/logo.png',
        size: 102400,
        parentId: '1',
        createdAt: '2025-01-15T09:15:00Z',
        updatedAt: '2025-01-15T09:15:00Z',
        metadata: {
            width: 200,
            height: 200,
            format: 'PNG'
        }
    },
    {
        id: '4',
        name: 'banner.jpg',
        type: 'image',
        url: '/images/banner.jpg',
        size: 512000,
        parentId: '2',
        createdAt: '2025-01-12T11:20:00Z',
        updatedAt: '2025-01-12T11:20:00Z',
        metadata: {
            width: 1200,
            height: 400,
            format: 'JPEG'
        }
    },
    {
        id: '5',
        name: '产品介绍.pdf',
        type: 'document',
        url: '/documents/product-intro.pdf',
        size: 2048000,
        parentId: '1',
        createdAt: '2025-01-14T16:45:00Z',
        updatedAt: '2025-01-14T16:45:00Z',
        metadata: {
            format: 'PDF'
        }
    },
    {
        id: '6',
        name: '宣传视频.mp4',
        type: 'video',
        url: '/videos/promo.mp4',
        size: 15728640,
        parentId: '2',
        createdAt: '2025-01-11T13:30:00Z',
        updatedAt: '2025-01-11T13:30:00Z',
        metadata: {
            duration: 120,
            format: 'MP4'
        }
    }
];

// Get files and folders
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId') || null;
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let files = [...mockFiles];

    // Filter by parent folder
    if (parentId) {
        files = files.filter(file => file.parentId === parentId);
    } else {
        // Root level - only show files without parentId
        files = files.filter(file => !file.parentId);
    }

    // Filter by type
    if (type) {
        files = files.filter(file => file.type === type);
    }

    // Apply pagination
    const paginatedFiles = files.slice(offset, offset + limit);

    // Calculate storage usage
    const storageUsage = {
        totalFiles: mockFiles.filter(f => f.type !== 'folder').length,
        totalFolders: mockFiles.filter(f => f.type === 'folder').length,
        totalSize: mockFiles
            .filter(f => f.type !== 'folder')
            .reduce((sum, file) => sum + (file.size || 0), 0),
        usedSpace: mockFiles
            .filter(f => f.type !== 'folder')
            .reduce((sum, file) => sum + (file.size || 0), 0),
        availableSpace: 1073741824 // 1GB in bytes
    };

    return NextResponse.json({
        success: true,
        data: {
            files: paginatedFiles,
            storage: storageUsage,
            pagination: {
                total: files.length,
                limit,
                offset
            }
        }
    });
});

// Upload file or create folder
export const POST = withErrorHandler(async (request: NextRequest) => {
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('multipart/form-data')) {
        // Handle file upload
        return handleFileUpload(request);
    } else {
        // Handle folder creation
        return handleFolderCreation(request);
    }
});

// Handle file upload
async function handleFileUpload(request: NextRequest) {
    // In a real implementation, you would process the multipart form data
    // For now, we'll simulate file upload with mock data

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parentId = formData.get('parentId') as string;

    if (!file) {
        throw new ValidationError('File is required');
    }

    // Simulate file processing
    const newFile: FileItem = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: getFileType(file.name),
        url: `/uploads/${Date.now()}-${file.name}`,
        size: file.size,
        parentId: parentId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
            format: getFileExtension(file.name)
        }
    };

    // Add to mock data
    mockFiles.push(newFile);

    return NextResponse.json({
        success: true,
        data: {
            file: newFile
        },
        message: 'File uploaded successfully'
    });
}

// Handle folder creation
async function handleFolderCreation(request: NextRequest) {
    const body = await request.json();
    const { name, parentId } = body;

    if (!name) {
        throw new ValidationError('Folder name is required');
    }

    // Check if folder already exists
    const existingFolder = mockFiles.find(
        file => file.type === 'folder' && file.name === name && file.parentId === parentId
    );

    if (existingFolder) {
        throw new ValidationError('A folder with this name already exists');
    }

    const newFolder: FileItem = {
        id: `folder-${Date.now()}`,
        name,
        type: 'folder',
        parentId: parentId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add to mock data
    mockFiles.push(newFolder);

    return NextResponse.json({
        success: true,
        data: {
            folder: newFolder
        },
        message: 'Folder created successfully'
    });
}

// Update file or folder
export const PATCH = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { id, name, parentId } = body;

    if (!id) {
        throw new ValidationError('File ID is required');
    }

    const file = mockFiles.find(f => f.id === id);
    if (!file) {
        throw new ValidationError('File not found');
    }

    // Update file properties
    if (name !== undefined) {
        file.name = name;
    }

    if (parentId !== undefined) {
        file.parentId = parentId;
    }

    file.updatedAt = new Date().toISOString();

    return NextResponse.json({
        success: true,
        data: {
            file
        },
        message: 'File updated successfully'
    });
});

// Delete file or folder
export const DELETE = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        throw new ValidationError('File ID is required');
    }

    const fileIndex = mockFiles.findIndex(f => f.id === id);
    if (fileIndex === -1) {
        throw new ValidationError('File not found');
    }

    const file = mockFiles[fileIndex];

    // Check if folder is empty
    if (file.type === 'folder') {
        const folderContents = mockFiles.filter(f => f.parentId === id);
        if (folderContents.length > 0) {
            throw new ValidationError('Cannot delete non-empty folder');
        }
    }

    // Remove file from mock data
    mockFiles.splice(fileIndex, 1);

    return NextResponse.json({
        success: true,
        message: `${file.type === 'folder' ? 'Folder' : 'File'} deleted successfully`
    });
});

// Utility functions
function getFileType(filename: string): FileItem['type'] {
    const extension = filename.toLowerCase().split('.').pop();

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (imageExtensions.includes(extension || '')) {
        return 'image';
    } else if (videoExtensions.includes(extension || '')) {
        return 'video';
    } else if (documentExtensions.includes(extension || '')) {
        return 'document';
    } else {
        return 'document'; // Default to document for unknown types
    }
}

function getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || 'unknown';
}
