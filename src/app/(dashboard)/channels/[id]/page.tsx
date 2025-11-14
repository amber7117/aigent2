
import { getChannels } from '@/lib/api';
import type { Channel } from '@/lib/types';
import ChannelEditForm from './channel-edit-form';

// 服务器组件，负责获取数据
async function ChannelEditPageLoader({ params }: { params: { id: string } }) {
  // 注意：在实际应用中，此数据获取会更高效。
  // 对于这个模拟 API，我们获取所有数据然后查找。
  const channels = await getChannels();
  const currentChannel = channels.find((c) => c.id === params.id);

  if (!currentChannel) {
    return <div>未找到渠道。</div>;
  }

  return <ChannelEditForm channel={currentChannel} />;
}


// generateStaticParams 必须从页面文件中导出。
export async function generateStaticParams() {
  const channels = await getChannels();
  return channels.map((channel) => ({
    id: channel.id,
  }));
}

// 默认导出必须处理服务器端逻辑，并且不能是客户端组件
export default ChannelEditPageLoader;
