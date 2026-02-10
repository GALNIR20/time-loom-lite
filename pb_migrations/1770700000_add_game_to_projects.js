/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const projects = app.findCollectionByNameOrId("projects")
  projects.fields.add(
    new Field({ type: "text", name: "game" })
  )
  app.save(projects)
}, (app) => {
  const projects = app.findCollectionByNameOrId("projects")
  projects.fields.removeByName("game")
  app.save(projects)
})
