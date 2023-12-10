# StarUML 定制版

[EN README](README_EN.md)

## 描述

让 [**StarUML**](https://staruml.io/) 更符合俺们的食用习惯 (\*/ω＼\*) ~

部分版本提供中文、英文两种语言的支持，详见 [releases](https://github.com/SeagullOddy/staruml-custom/releases)。

## 首次使用

假设你已经安装好了**对应版本的** StarUML 程序。

### 第一步：获取 app.asar 文件

下载[最新发布的 app.asar 文件](https://github.com/SeagullOddy/staruml-custom/releases)。

### 第二步：替换原版文件

**小贴士：** 在这之前，推荐你为旧版文件做一下备份哦~

替换掉原版的 app.asar 文件，其位于 **<程序安装路径>/resources/** 路径下。

## 更新方法

先更新 StarUML 程序，再重新完成[首次使用](#首次使用)中所列的步骤。

## 重要更新日志

源版本：v6.0.1

### v601.0.0

- 规则就是用来打破的~

### v601.0.1

- 捍卫银河中的美~
- 修改了一些默认设置
  - **resources/default/preferences/default.json**
    - "general.working-file"：`false` -> `true`
    - "view.fontSize"：`13` -> `20`
    - "view.lineStyle"：`1` -> `2`
  - **extensions/essential/uml/preferences/uml.json**
    - "uml.interface.stereotypeDisplay"：`"icon"` -> `"label"`
    - "uml.interface.suppressOperations"：`true` -> `false`
- 添加了一些默认设置
  - **extensions/essential/uml/toolbox/uml.json**
    - "UMLAggregation.command-arg.model-init"：`"end1": { "navigable": "navigable" }`
    - "UMLComposition.command-arg.model-init"：`"end1": { "navigable": "navigable" }`
  - **src/core/core.js**
    - class FreelineEdgeView.initialize()：`this.lineStyle = EdgeView.LS_OBLIQUE`
  - **extensions/essential/uml/elements.js**
    - class UMLNoteLinkView.constructor()：`this.lineStyle = EdgeView.LS_OBLIQUE`
