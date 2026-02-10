/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Add allowed_games JSON field to users (stores array like ["SGH", "HOF"])
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "json2847593100",
    "maxSize": 2000000,
    "name": "allowed_games",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Remove allowed_games field
  collection.fields.removeById("json2847593100")

  return app.save(collection)
})
