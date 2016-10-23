'use strict';

const aws     = require('aws-sdk')
const uuid    = require('node-uuid')
const request = require('request')

const dynamoDBOptions = { apiVersion: '2012-08-10', region: 'ap-northeast-1' }
const dynamoDBCommonParams = { TableName: 'value-changing-monitor' }
const dynamoDB = new aws.DynamoDB(dynamoDBOptions)

/**
 *  Create new resorce for monitoring
 **/

const validatesPresenceOfCreateResources = (body) => {
    return new Promise((resolve, reject) => {
        if (body.name && body.slack && body.slack.url && body.slack.channel && body.slack.template) {
            resolve(body)
        } else {
            reject(`Body JSON is invalid. example: { name:"resource name", initialValue: 10, slack: { url: "https://hooks.slack.com/services/ABCDEF/123456/qwertyuiop", channel: "#notifications", template: "Value of {value} is changed!" } }`)
        }
    })
}

const validatesSlackURL = (url) => {
    if (url.match(/^https?:\/\/hooks.slack.com\//)) {
        Promise.resolve()
    } else {
        Promise.reject("Slack URL must be begin with https://hooks.slack.com")
    }
}

const validatesSlackTemplate = (template) => {
    if (template.match(/{value}/)) {
        Promise.resolve()
    } else {
        Promise.reject("Slack template must be include '{value}' as a template variable. '{value}' will be replaced of the actual value.")
    }
}

const validatesBody = (body) => {
    return validatesPresenceOfCreateResources(body).then(() => {
        return validatesSlackURL(body.slack.url)
    }).then(() => {
        return validatesSlackTemplate(body.slack.template)
    })
}

const putParams = (itemUUID, body) => {
    let slackChannel = body.slack.channel.match(/^#/) ? body.slack.channel : `#${body.slack.channel}`
    let itemAttr = {
        Item : {
            uuid : { S: String(itemUUID)},
            name : { S: String(body.name) },
            value : { S: String(body.initialValue) },
            slackURL: { S: String(body.slack.url) },
            slackChannel: { S: String(slackChannel) },
            slackTemplate: { S: String(body.slack.template) },
        }
    }

    if (body.slack.icon_emoji) {
        itemAttr.Item.slackEmoji = { S: String(body.slack.icon_emoji) }
    }

    return Object.assign({}, dynamoDBCommonParams, itemAttr)
}

module.exports.createResource = (event, context, callback) => {
    let itemUUID = uuid.v4()
    let body = event.body

    validatesBody(body).then(() => {
        let params = putParams(itemUUID, body)
        dynamoDB.putItem(params, (error, data) => {
            if (error) {
                callback(error, null)
            } else {
                let item = {
                    uuid: itemUUID,
                    name: body.name,
                    value: body.initialValue,
                }
                callback(null, item)
            }
        })
    }).catch(error => {
        callback(error, null)
    })
}


/**
 *  Update value and notify to slack on value is changed
 **/

const validatesUUID = (paramsUUID) => {
    return new Promise((resolve, reject) => {
        if (paramsUUID.length < 36) {
            reject('UUID is invalid.')
        } else {
            resolve(paramsUUID)
        }
    })
}

const commonParams = (itemUUID) => {
    return Object.assign({}, dynamoDBCommonParams, {
        Key : {
            uuid : { S: String(itemUUID)},
        }
    })
}

const getParams = (params) => {
    return Object.assign({}, params, {
        ConsistentRead: false,
    })
}

const updateParams = (params, newValue) => {
    return Object.assign({}, params, {
        AttributeUpdates: {
            value: {
                Action: 'PUT',
                Value: { S: newValue }
            }
        }
    })
}

const getItem = (params) => {
    return new Promise((resolve, reject) => {
        dynamoDB.getItem(params, (error, data) => {
            if (error || data.Item === null) {
                reject('Resource was not found')
            } else {
                resolve(data.Item)
            }
        })
    })
}

const postToSlack = (item, newValue) => {
    let body = item.slackTemplate.S.replace('{value}', newValue)
    let payload = {channel: item.slackChannel.S, username: "valuemonitor", text: body}
    if(item.slackEmoji) { payload.icon_emoji = item.slackEmoji.S }

    console.log(payload)

    return new Promise((resolve, reject) => {
        request.post({url: item.slackURL.S, form: {payload: JSON.stringify(payload)}}, (err,httpResponse,body) => {
            if (err === null) {
                resolve(item)
            } else {
                reject('failed to POST to Slack')
            }
        })
    })
}

module.exports.updateResource = (event, context, callback) => {
    let newValue = String(event.body.value)
    let dynamoParams = commonParams(event.path.uuid)

    validatesUUID(event.path.uuid).then(paramsUUID => {
        let params = getParams(dynamoParams)
        return getItem(params)
    }).then(item => {
        if (item.value.S == newValue) {
            callback(null, {result: 'not changed'})
        } else {
            return postToSlack(item, newValue)
        }
    }).then(item => {
        let params = updateParams(dynamoParams, newValue)
        dynamoDB.updateItem(params, (error, data) => {
            if (error) {
                callback(error, null)
            } else {
                callback(null, {result: 'changed'})
            }
        })
    }).catch(error => {
        callback(error, null)
    })
}
