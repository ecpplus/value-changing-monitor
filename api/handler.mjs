'use strict';

// const aws     = require('aws-sdk')
import { randomUUID } from "crypto";

const dynamoDBOptions = { apiVersion: '2012-08-10', region: 'ap-northeast-1' }
const dynamoDBCommonParams = { TableName: 'value-changing-monitor' }
// const dynamoDB = new aws.DynamoDB(dynamoDBOptions)

import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"; // ES Modules import
const client = new DynamoDBClient({});

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
        },
    }

    if (body.slack.icon_emoji) {
        itemAttr.Item.slackEmoji = { S: String(body.slack.icon_emoji) }
    }

    return Object.assign({}, dynamoDBCommonParams, itemAttr)
}

export const createResource = async (event) => {
    const itemUUID = randomUUID()
    const body = JSON.parse(event.body)

    await validatesBody(body)
    const params = putParams(itemUUID, body)
    const command = new PutItemCommand(params)

    const response = await client.send(command)
    const item = {
        uuid: itemUUID,
        name: response.Item.name,
        value: response.Item.initialValue,
    }
    return item
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

const getItem = async (params) => {
    const command = new GetItemCommand(params)
    const response = await client.send(command)
    return response.Item
}

const postToSlack = async (item, newValue) => {
    let body = item.slackTemplate.S.replace('{value}', newValue)
    let payload = {channel: item.slackChannel.S, username: "valuemonitor", text: body}
    if(item.slackEmoji) { payload.icon_emoji = item.slackEmoji.S }
    
    const url = item.slackURL.S
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload))
    
    const options = {
      method: 'POST',
      body: formData,
    }
    
    const response = await fetch(url, options);
    console.log(response);
}

export const updateResource = async (event) => {
    const newValue = String(event.body.value)
    const dynamoParams = commonParams(event.path.uuid)

    const uuid = event.path.uuid
    await validatesUUID(uuid)
    const getItemParams = getParams(dynamoParams)
    const item = await getItem(getItemParams)

    if (item.value.S == newValue) {
        return {result: 'not changed'}
    } 
    
    await postToSlack(item, newValue)

    let updateItemParams = updateParams(dynamoParams, newValue)
    const updateItemCommand = new UpdateItemCommand(updateItemParams)
    await client.send(updateItemCommand)

    return {result: 'changed'}
}
