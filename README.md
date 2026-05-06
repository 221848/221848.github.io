# 乱斗棋盘

一个回合制战棋游戏，通过猜拳决定行动顺序。

## 部署到 GitHub Pages

1. **创建仓库**：将此项目上传到 GitHub 仓库

2. **启用 GitHub Pages**：
   - 进入仓库 → Settings → Pages
   - Source 选择 `main` 分支，Folder 选择 `/root`
   - 点击 Save

3. **等待部署**：GitHub 会自动部署，访问地址格式：`https://<你的用户名>.github.io/<仓库名>/`

## 项目结构

```
game/
├── index.html          # 主入口页面
├── 404.html            # SPA 路由回退
├── .nojekyll           # 禁用 Jekyll 处理
├── css/
│   └── style.css       # 游戏样式
└── js/
    ├── main.js         # 游戏主逻辑
    ├── state.js        # 游戏状态管理
    ├── board.js        # 棋盘逻辑
    ├── rps.js          # 猜拳逻辑
    ├── actions.js      # 行动执行
    ├── heroes/         # 英雄定义
    ├── skills/         # 技能系统
    ├── ui/             # UI 组件
    ├── ai/             # AI 策略
    └── utils/          # 工具函数
```

## 游戏玩法

1. 选择你的英雄
2. 通过猜拳（石头/剪刀/布）决定回合先手
3. 胜利方获得行动机会：移动、攻击或使用技能
4. 将对方英雄生命值降为 0 即可获胜

## 开发

使用 Live Server 扩展启动开发服务器即可运行游戏。