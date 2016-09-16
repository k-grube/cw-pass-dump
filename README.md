## Returned Results

```
[
  {
    "configId": "123",
    "usernames": [
      {
        "username": "this is a username",
        "questionId": 234,
        "answerId": 345,
        "configId": 123
      }
    ],
    "passwords": [
      {
        "password": "this is a password",
        "questionId": 235,
        "answerId": 346,
        "configId": 123
      }
    ]
  },
  ...
]
```


## Code Flow

- Get all config types
- Get the questions on each config type
- Filter `configId`s to those containing password and 'username' fields
- Get each config of each type
- Collate results


## Ideas

- User mapping between password types and config types
- User specification for username/password combinations for each config type
- Does not paginate results, or filter by client.
- There may be multiple username/password boxes on a single config, how do these collate?
- How do these map to credential types?