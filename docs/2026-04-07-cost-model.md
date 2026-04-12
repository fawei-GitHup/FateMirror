# FateMirror 成本与盈利模型

日期：2026-04-07  
版本：v1

## 1. 目标

这份文档用于回答三个问题：

1. 免费层到底该给多少次才不容易被高频用户吃穿。
2. `Pro` 如果继续按 `$9.9/月`、`$79/年` 售卖，合理额度应该是多少。
3. 除了月付和年付之外，还能靠哪些结构提升盈利能力。

## 2. 基础假设

### 2.1 当前产品价格

- `Pro 月付`: `$9.9/月`
- `Pro 年付`: `$79/年`
- 当前 PRD 里写的是 `Free / Pro` 双层

### 2.2 模型成本假设

为避免一开始就绑定到高价模型，这里用官方价格较低、适合作为大规模日常对话底座的 `GPT-4.1 mini` 做测算。

官方公开价格：

- 输入：`$0.40 / 1M tokens`
- 输出：`$1.60 / 1M tokens`

来源：

- OpenAI Pricing: <https://openai.com/api/pricing/>
- GPT-4.1 mini model page: <https://developers.openai.com/api/docs/models/gpt-4.1-mini>

### 2.3 单次 guided session 假设

按 FateMirror 当前“老墨引导式反思”实际形态，先用一个保守但可执行的估算：

- 输入 tokens：`8,000`
- 输出 tokens：`2,000`

单次成本：

- 输入成本：`8000 / 1,000,000 * 0.40 = $0.0032`
- 输出成本：`2000 / 1,000,000 * 1.60 = $0.0032`
- 单次 guided session 合计：`$0.0064`

说明：

- 这里只算对话本身，不含数据库、Vercel、Supabase、支付通道等固定成本。
- 也不含章节生成、模式提取、命运树分析等后台 AI 调用，这些属于附加成本。

## 3. 免费层成本测算

### 3.1 如果免费用户每天 5 次

- 单日成本：`5 * $0.0064 = $0.032`
- 单月满额成本：`30 * $0.032 = $0.96 / 活跃免费用户`

### 3.2 如果免费用户每天 10 次

- 单日成本：`10 * $0.0064 = $0.064`
- 单月满额成本：`30 * $0.064 = $1.92 / 活跃免费用户`

### 3.3 结论

对于早期产品，`10/day` 偏慷慨。  
更稳的免费层是：

- `3/day`: 更保守
- `5/day`: 最平衡
- 不建议直接给 `10/day`

## 4. Pro 套餐成本测算

### 4.1 按月额度测算

| 套餐额度 | 模型成本/月/人 | 对 `$9.9/月` 的毛空间 |
|---|---:|---:|
| 200 次/月 | `$1.28` | 较充足 |
| 300 次/月 | `$1.92` | 充足 |
| 500 次/月 | `$3.20` | 仍可接受 |
| 1000 次/月 | `$6.40` | 明显变薄 |

### 4.2 年付的实际压力

年付 `$79/年` 折合约 `$6.58/月`。

这意味着：

- 如果年付用户每月只有 `200-300` 次，仍然有空间
- 如果年付用户长期接近 `1000` 次/月，就会非常危险
- 所以不适合把年付做成真正无限

## 5. 推荐套餐结构

### 5.1 最务实方案

#### Free

- 每天 `5` 次 guided
- `freewrite` 保留
- 命运树、章节、深度分析保留限制

#### Pro 月付 `$9.9/月`

- 每月 `300` 次 guided
- 完整命运树
- 章节系统
- 循环预警
- 更完整画像与成长系统

#### Pro 年付 `$79/年`

- 不写无限
- 建议同样按“月度恢复额度”处理
- 可设为每月 `250-300` 次 guided

### 5.2 为什么不建议前台卖 token

不建议把套餐文案写成 “你还剩多少 token”，原因：

- 用户不理解 token
- 容易把产品做成开发者工具心智
- 不利于消费级转化

推荐：

- 前台展示 “剩余 5 次深聊”
- 后台按 token 真正限流与控成本

## 6. 除月付和年付外的盈利方式

### 6.1 加油包

适合高频用户，但不影响普通用户定价理解。

建议：

- `100 次 guided` = `$3.9`
- `300 次 guided` = `$8.9`

### 6.2 BYOK（自带 API Key）

这是最适合 FateMirror 的高频用户方案之一。

优点：

- 平台不承担重度用户的模型成本
- 订阅卖的是产品能力、命运树、章节、长期记忆结构
- 用户体验仍保留在 FateMirror 内

缺点：

- 转化门槛更高
- 需要安全存储和加密用户 key

### 6.3 模型分层

不要把所有调用都用同一个模型。

建议：

- 日常 guided chat：便宜模型
- 章节生成 / 深分析 / 高价值节点总结：更贵模型

这样可以显著降低平均调用成本。

## 7. 竞品常见做法

竞品一般不会直接把“高成本 AI 能力”做成无限且无约束。

### Rosebud

官方帮助页明确提到免费层的 `Personalized prompts` 是 `2/day`，付费层 Bloom 才是 unlimited。

来源：

- Rosebud pricing/help: <https://help.rosebud.app/getting-started/pricing>
- Rosebud personalized prompts: <https://help.rosebud.app/tools-for-growth/personalized-prompts>

### Replika

官方帮助页说明聊天本身可免费使用，但更高层能力按档位限制；例如某些高级能力是 `100/week`、`50/week` 这种显式配额，而不是完全无上限。

来源：

- Replika free plan: <https://help.replika.com/hc/en-us/articles/115001094511-Is-Replika-free>
- Replika subscription tiers: <https://help.replika.com/hc/en-us/articles/39551043419149-Choosing-a-Subscription>

### 结论

主流做法是：

- 免费层限量
- 付费层高额度
- 高成本能力单独限额或更高档位

## 8. 建议结论

### 立即可执行版本

| 层级 | 推荐规则 |
|---|---|
| Free | `5/day guided` |
| Pro 月付 | `300/month guided` |
| Pro 年付 | `250-300/month guided` |
| 超额后 | 加油包 或 BYOK |

### 不建议

- 不建议 `Free 10/day`
- 不建议 `Pro 无限`
- 不建议前台直接按 token 售卖

## 9. 后续行动

建议按顺序执行：

1. 将 PRD 里的 `Pro 无限 AI 对话` 改成 `高额度`
2. 在代码里增加 usage accounting
3. 增加 BYOK 方案
4. 增加加油包方案
5. 将模型切成“便宜主模型 + 高价值任务模型”
Authority: historical financial analysis
Use this file for pricing and margin background only.
Current product and model routing truth lives in `docs/STATUS.md` and runtime code.

