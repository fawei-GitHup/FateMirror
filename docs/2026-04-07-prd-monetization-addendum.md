# FateMirror PRD Monetization Addendum
Authority: historical pricing-policy addendum
Use this file for change history and monetization rationale.
For the current enforced product model, prefer `docs/STATUS.md`, `README.md`, and runtime code.

日期：2026-04-07

## 目的

这份补充文档用于覆盖旧 PRD 中 `Pro 无限 AI 对话` 的设定，并将其替换为更可持续的配额模型。

## 生效后的套餐规则

### Free

- 每天 `5` 次 guided chat
- freewrite 保留
- 命运树预览上限 `10` 个节点
- 章节功能关闭
- 等级上限 `Lv.2`

### Pro 月付

- 价格：`$9.9/月`
- 每月 `300` 次 guided chat
- 完整命运树
- 章节系统
- 循环预警
- 完整等级成长系统
- 数据导出

### Pro 年付

- 价格：`$79/年`
- 产品能力与月付一致
- 额度型设计，不承诺无限

## 设计原则

1. 不再承诺“无限 AI 对话”
2. 前台展示次数/额度，不展示 token
3. 后台仍按 token 做成本控制
4. 为后续 `BYOK` 和 `加油包` 留出结构空间

## 后续规划

### BYOK

- Pro 用户可接入自己的 API Key
- 平台卖产品能力，不承担全部高频推理成本

### Add-on Packs

- 额外购买 guided session 包
- 用于超出月额度的高频用户

## 代码对齐状态

本补充文档对应的当前代码规则：

- `Free: 5/day`
- `Pro: 300/month`
- UI 文案已从 “unlimited” 改为 “high allowance / 300 sessions per month”
Authority: historical pricing-policy addendum
Use this file for change history and monetization rationale.
For the current enforced product model, prefer `docs/STATUS.md`, `README.md`, and runtime code.
