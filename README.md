# OmniChat

OmniChat 是一个统一的聊天解决方案，旨在将来自多个渠道（包括 WhatsApp、Telegram、Facebook Messenger 和网站小部件）的对话集中到一个界面中。它利用 AI 驱动的代理来自动化回复，并为人工代理提供一个用于实时聊天的无缝仪表板。

## 核心功能

- **渠道集成**：连接到 WhatsApp、Telegram、Facebook Messenger 和网站小部件，以创建一个统一的聊天界面。
- **AI 代理管理**：配置多个 AI 提供商（OpenAI、DeepSeek、Gemini），创建自定义代理模板，并将代理分配给特定用户和渠道。
- **实时聊天界面**：一个使用 Socket.IO 的基于 Web 的 UI，用于显示来自所有集成渠道的实时聊天对话，并带有消息状态更新（已发送、已送达、已读）。
- **AI 驱动的自动回复**：使用基于规则的工具对响应进行推理，根据特定渠道的 AI 代理自动进行对用户消息的初始回复。
- **管理仪表板**：一个用于管理用户、渠道、AI 配置、网站小部件设置和查看日志的中央仪表板。
- **小部件嵌入**：可嵌入的 JavaScript 小部件，可将实时聊天功能直接集成到网站中。
- **用户身份验证**：使用 JWT 进行安全的用户注册、登录和基于角色的权限控制（管理员/代理）。

## 入门指南

要开始使用，请查看 `src/app/page.tsx`。

1.  **安装依赖项：**
    ```bash
    npm install
    ```

2.  **运行开发服务器：**
    ```bash
    npm run dev
    ```

打开 [http://localhost:3000](http://localhost:3000) 在您的浏览器中查看结果。

## 项目结构

该项目遵循 Next.js App Router 范例，将大部分代码放在 `src` 目录下。

-   `src/app`: 包含应用程序的所有页面和路由。
    -   `(auth)`: 包含身份验证页面的路由组（登录、注册）。
    -   `(dashboard)`: 包含应用程序核心功能的路由组，由共享布局包裹。
        -   `page.tsx`: 仪表板主页。
        -   `inbox/[id]`: 显示个人聊天对话的动态路由。
        -   `channels`: 用于管理不同聊天渠道的页面。
        -   `agents`: 用于创建和管理 AI 代理的页面。
        -   `settings`: 应用程序设置页面。
-   `src/components`: 包含整个应用程序中使用的可重用 React 组件。
    -   `dashboard`: 特定于仪表板布局和功能的组件（例如，`Sidebar`、`Header`、`ChatDisplay`）。
    -   `icons`: 自定义图标组件，用于不同的渠道徽标。
    -   `ui`: 通用、可重用的 UI 组件（例如，`Button`、`Card`、`Input`），大部分由 `shadcn/ui` 提供支持。
-   `src/lib`: 包含辅助函数、类型定义和核心业务逻辑。
    -   `api.ts`: 用于与后端 API 交互的函数。
    -   `data.ts`: 用于开发的模拟数据。
    -   `types.ts`: TypeScript 类型定义。
    -   `utils.ts`: 通用实用函数。
    -   `firebase`: Firebase 配置和初始化。
-   `src/ai`: 包含与 Genkit AI 框架相关的逻辑。
    -   `genkit.ts`: Genkit 插件和配置的初始化。
    -   `flows`: 定义 AI 工作流（例如，`autoReplyUserMessage`）。
-   `src/hooks`: 包含自定义 React 钩子（例如，`useToast`、`useMobile`）。
-   `public`: 包含静态文件。
    -   `widget.js`: 用于嵌入到外部网站的可嵌入聊天小部件脚本。

## 样式指南

- **主色**：深蓝色 (#2962FF)，以传达信任和稳定。
- **背景色**：浅灰色 (#F0F2F5)，营造干净、现代的感觉。
- **强调色**：青色 (#00BCD4)，用于突出显示交互元素和号召性用语。
- **正文和标题字体**：'Inter' 无衬线字体，打造现代、机械、客观的外观。
- **代码字体**：'Source Code Pro'，用于显示代码片段。
- **图标**：为不同渠道、用户角色和消息状态使用一致且清晰的图标。
- **动画**：用于加载状态和消息传递确认的微妙动画。
# aigent2
# aigent2
