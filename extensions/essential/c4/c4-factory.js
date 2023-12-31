/*
 * Copyright (c) 2013-2023 Minkyu Lee. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the
 * property of Minkyu Lee. The intellectual and technical concepts
 * contained herein are proprietary to Minkyu Lee and may be covered
 * by Republic of Korea and Foreign Patents, patents in process,
 * and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Minkyu Lee (niklaus.lee@gmail.com).
 *
 */

const Mustache = require('mustache')
const {Element} = app.type
const ERR_INVALID_LINK = 'Invalid connection ({{.}})'

// Preconditions ...........................................................

function linkPrecondition (options) {
  app.factory.assert(
    (options.tailModel instanceof type.C4Element) && (options.headModel instanceof type.C4Element),
    Mustache.render(ERR_INVALID_LINK, options.modelType)
  )
}

// Create C4 diagram function ..................................................

function diagramFn (parent, options) {
  var model, diagram
  parent = parent || app.project.getProject()
  if (parent instanceof type.Project) {
    model = new type.C4Model()
    model.name = Element.getNewName(parent.ownedElements, 'C4Model')
    model._parent = parent
    diagram = new type.C4Diagram()
    diagram.name = Element.getNewName(parent.ownedElements, diagram.getDisplayClassName())
    model.ownedElements.push(diagram)
    diagram._parent = model
    if (options.diagramInitializer) {
      options.diagramInitializer(diagram)
    }
    app.engine.addModel(parent, 'ownedElements', model)
  } else {
    diagram = new type.C4Diagram()
    diagram.name = Element.getNewName(parent.ownedElements, diagram.getDisplayClassName())
    if (options.diagramInitializer) {
      options.diagramInitializer(diagram)
    }
    app.engine.addModel(parent, 'ownedElements', diagram)
  }
  if (diagram) {
    diagram = app.repository.get(diagram._id)
  }
  options.factory.triggerDiagramCreated(diagram)
  return diagram
}

function _modelFn (parent, field, options) {
  return app.factory.defaultModelFn(parent, field, options)
}

function _modelAndViewFn (parent, diagram, options) {
  return app.factory.defaultModelAndViewFn(parent, diagram, options)
}

function _directedRelationshipFn (parent, diagram, options) {
  return app.factory.defaultDirectedRelationshipFn(options.tailModel, diagram, options)
}

function _viewOnDiagramFn (model, diagram, options) {
  return app.factory.defaultViewOnDiagramFn(model, diagram, options)
}

// Create Diagram ..........................................................

app.factory.registerDiagramFn('C4Diagram', diagramFn)

// Create Model ............................................................

app.factory.registerModelFn('C4Model', _modelFn)
app.factory.registerModelFn('C4Person', _modelFn)
app.factory.registerModelFn('C4SoftwareSystem', _modelFn)
app.factory.registerModelFn('C4Container', _modelFn)
app.factory.registerModelFn('C4Component', _modelFn)

// Create Model And View ...................................................

app.factory.registerModelAndViewFn('C4Person', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4SoftwareSystem', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4Container', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4ContainerDatabase', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4ContainerWebApp', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4ContainerDesktopApp', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4ContainerMobileApp', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4Component', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4Element', _modelAndViewFn)
app.factory.registerModelAndViewFn('C4Relationship', _directedRelationshipFn, { precondition: linkPrecondition })

// Create View .............................................................

app.factory.registerViewOfFn('C4Diagram', _viewOnDiagramFn)
