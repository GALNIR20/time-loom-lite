/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users")

  // Create "projects" collection
  const projects = new Collection({
    name: "projects",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { type: "text", name: "feature_name", required: true },
      { type: "text", name: "project_start", required: true },
      { type: "text", name: "preset", required: true },
      { type: "bool", name: "show_detailed" },
      { type: "json", name: "overrides" },
      { type: "json", name: "hidden_milestones" },
      { type: "text", name: "locked_dev_start" },
      { type: "relation", name: "owner", collectionId: usersCol.id, maxSelect: 1 },
    ],
  })
  app.save(projects)

  // Create "project_activity" collection
  const savedProjects = app.findCollectionByNameOrId("projects")
  const activity = new Collection({
    name: "project_activity",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { type: "relation", name: "project", collectionId: savedProjects.id, maxSelect: 1, cascadeDelete: true, required: true },
      { type: "text", name: "action", required: true },
      { type: "json", name: "details" },
    ],
  })
  app.save(activity)
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("project_activity")) } catch(e) {}
  try { app.delete(app.findCollectionByNameOrId("projects")) } catch(e) {}
})
