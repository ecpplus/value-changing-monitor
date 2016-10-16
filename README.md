# Value Changing Monitor

This is an super simple API which get you know some value changes! Implemented with [Serverless](https://github.com/serverless/serverless). So this service couldn't be down as long as AWS services are going well.

You can watch for example, registration count of some service, a product price, temparature, .etc.  Anything which has value can be monitored.

Of cource you can build in your private environment and run:smile:

# Usage

1. Create your resource that is to be monitored. Define initial value and Slack webhook info for receive notifications.
2. Just only PUT a value continuously. 


## Create a resource

### Request

POST a JSON to create a resource.  

#### URL

**https://monitor.ecp.plus/resources**

#### Body

JSON schema is following.

```json
{
  "name": "TEST",
  "initialValue": 0,
  "slack": {
    "url": "https://hooks.slack.com/services/AAAA/1111/qwerty",
    "channel": "#value_test",
    "template": "Users count is {value}",
    "icon_emoji": ":smile:"
  }
}
```

All fields except `slack.icon_emoji` are required.

`template`.  It includes a special placeholder `{value}`.  When posting a notification, the `{value}` will be replaced to the actual value.

#### cURL example

```sh
curl https://monitor.ecp.plus/resources -X POST -d "{name: 'Registration count', initialValue: 0, slack: {url: 'https://hooks.slack.com/services/1111/AAAA/qwerty', channel: '#value_changing_test', template: 'Awesome value is {value}'
, icon_emoji: ':smile:'}}"
```

### Response

```json
{
  "uuid": "f0d675cf-b8dc-46c9-9536-23ab358d2817",
  "name": "Registration count",
  "value": 0
}
```

**Please keep the `uuid`.**  
You will use `uuid` to PUT values.


## Put a value

If PUT value is different from previous value, you will receive a Slack notification.

### Request

#### URL

**https://monitor.ecp.plus/resources/{uuid}**

`{uuid}` is that you got when creating.

#### Body

PUT only a value.

```javascript
{
  "value": 100
}
```

#### cURL example

```sh
curl https://monitor.ecp.plus/resources/f0d675cf-b8dc-46c9-9536-23ab358d2817 -X PUT -d "{value: 100}"
```
### Response

If the value has changed.

```json
{
  "result": "changed"
}
```

If the value hasn't changed.


```json
{
  "result": "not changed"
}
```