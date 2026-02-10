/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_484305853")

  // Allow admins to update and delete any project
  unmarshal({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "owner = @request.auth.id || @request.auth.role = 'admin'",
    "listRule": "@request.auth.id != ''",
    "updateRule": "owner = @request.auth.id || @request.auth.role = 'admin'",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_484305853")

  // Revert to owner-only update/delete
  unmarshal({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "owner = @request.auth.id",
    "listRule": "@request.auth.id != ''",
    "updateRule": "owner = @request.auth.id",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
