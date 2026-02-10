/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_484305853")

  // update collection data - allow all authenticated users to list/view,
  // but only the owner can update/delete
  unmarshal({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "owner = @request.auth.id",
    "listRule": "@request.auth.id != ''",
    "updateRule": "owner = @request.auth.id",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_484305853")

  // revert to previous rules (any authenticated user can do anything)
  unmarshal({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "listRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
