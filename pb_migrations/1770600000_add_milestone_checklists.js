/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const projects = app.findCollectionByNameOrId("projects")
  projects.fields.add(
    new Field({ type: "json", name: "milestone_checklists" })
  )
  app.save(projects)
}, (app) => {
  const projects = app.findCollectionByNameOrId("projects")
  projects.fields.removeByName("milestone_checklists")
  app.save(projects)
})
