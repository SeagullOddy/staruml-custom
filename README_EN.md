# StarUML Custom Edition

## Description

Make [**StarUML**](https://staruml.io/) more in line with "our" usage habits (\*/ω＼\*) ~

Some versions provide support in both Chinese and English. For more information, please see [releases](https://github.com/SeagullOddy/staruml-custom/releases).

## First Use

Suppose you have installed the **corresponding version** of the StarUML program.

1. First Step: Get app.asar file

    Download [the latest released app.asar file](https://github.com/SeagullOddy/staruml-custom/releases)。

2. Second Step: Replace original app.asar file

    **Tips：** Before that, it is recommended that you make a backup of the original app.asar file~

    Replace original app.asar file located in `<Program Installation Path>/resources/` path.

## Update Method

Update the StarUML program before re-completing the steps listed in [first use](#first-use).

## Main Update Logs

Source Version: v6.0.1

### v601.0.0

- Rules are made to be broken~

### v601.0.1

- Protect all the beauty~
- Modify Some default settings
  - **resources/default/preferences/default.json**
    - "general.working-file": `false` -> `true`
    - "view.fontSize": `13` -> `20`
    - "view.lineStyle": `1` -> `2`
  - **extensions/essential/uml/preferences/uml.json**
    - "uml.interface.stereotypeDisplay": `"icon"` -> `"label"`
    - "uml.interface.suppressOperations": `true` -> `false`
- Add Some default settings
  - **extensions/essential/uml/toolbox/uml.json**
    - "UMLAggregation.command-arg.model-init": `"end1": { "navigable": "navigable" }`
    - "UMLComposition.command-arg.model-init": `"end1": { "navigable": "navigable" }`
  - **src/core/core.js**
    - class FreelineEdgeView.initialize()：`this.lineStyle = EdgeView.LS_OBLIQUE`
  - **extensions/essential/uml/elements.js**
    - class UMLNoteLinkView.constructor()：`this.lineStyle = EdgeView.LS_OBLIQUE`
