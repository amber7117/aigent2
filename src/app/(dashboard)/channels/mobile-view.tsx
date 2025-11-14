"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { channelIcons } from "@/lib/data";
import { Channel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MobileChannelsViewProps {
  channels: Channel[];
}

export function MobileChannelsView({ channels }: MobileChannelsViewProps) {
  return (
    <div className="space-y-4 lg:hidden">
      {channels.map((channel) => {
        const Icon = channelIcons[channel.type];
        return (
          <Card key={channel.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                  <CardTitle>{channel.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Refresh</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Type:</span>
                <span className="text-sm text-muted-foreground ml-2">{channel.type}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Status:</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2",
                    channel.status === "online"
                      ? "border-green-500 text-green-500"
                      : "border-destructive text-destructive"
                  )}
                >
                  {channel.status}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Last Activity:</span>
                <span className="text-sm text-muted-foreground ml-2">{channel.lastActivity}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Assigned Agent:</span>
                <span className="text-sm text-muted-foreground ml-2">{channel.assignedAgent}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Auto Reply:</span>
                <span className="text-sm text-muted-foreground ml-2">{channel.autoReply ? "On" : "Off"}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
