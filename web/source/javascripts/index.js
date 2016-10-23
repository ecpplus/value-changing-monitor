import m from 'mithril'

class Component {
    constructor(props) {
        this.props = props || {}

        var component = this
        this.controller = function() {
            var ctrl = {}
            component.init(ctrl)
            return ctrl
        }
        this.controller.$original = this.init
    }

    init(ctrl) {
    }

    instance() {
        var component = this
        var controller = new this.controller()
        controller.render = function() {
            return component.view(controller)
        }
        return controller
    }
}

class Resource {
    constructor(data) {
        data = data || {}
        this.name = m.prop(data.name || "")
        this.initialValue = m.prop(data.initialValue || "")
        this.slackUrl = m.prop(data.slackUrl || "")
        this.slackChannel = m.prop(data.slackchannel || "")
        this.slackTemplate = m.prop(data.slackTemplate || "")
        this.slackIconEmoji = m.prop(data.slackIconEmoji || "")
    }

    toParams() {
        return {
            "name": this.name(),
            "initialValue": this.initialValue(),
            "slack": {
                "url": this.slackUrl(),
                "channel": this.slackChannel(),
                "template": this.slackTemplate(),
                "icon_emoji": this.slackIconEmoji()
            }
        }
    }

    save() {
        return m.request({method: "POST", url: "https://monitor.ecp.plus/resources", data: this.toParams()})
    }
}

class ResourceResult extends Component {
    init(data) {
        this.resource = data
    }

    view() {
        return [m('div', [
            m('h2', m.trust('Resource created &#128077;')),
            m('p', 'To monitor the resource, keep doing PUT requests as following,'),
            m('dl', [
                m('dt', 'URL'),
                m('dd', `https://monitor.ecp.plus/resources/${this.props.uuid}`),
                m('dt', 'HTTP method'),
                m('dd', 'PUT'),
                m('dt', 'Request body example (JSON)'),
                m('dd', [
                    m('textarea.form-control', {row: 3}, `{ value: 100 }`)
                ]),
                m('dt', 'cURL example'),
                m('dd', [
                    m('textarea.form-control', {row: 3}, `curl https://monitor.ecp.plus/resources/${this.props.uuid} -X PUT -d "{value: 100}"`)
                ]),
            ]),
        ])]
    }
}

class CreateForm extends Component {
    init() {
        this.resource = m.prop(new Resource())
        this.saving = false
    }

    save(event) {
        event.preventDefault()

        this.saving = true
        m.redraw(true)

        this.resource().save().then(result => {
            m.mount(
                document.getElementById('form'),
                new ResourceResult(result)
            )
            this.saving = false
        }).catch(error => {
            alert(error)
            this.saving = false
        })

        return false
    }

    createButton() {
        if (this.saving) {
            return [
                m('span', 'Creating...'),
                m('div.spinner.js-spinner', ''),
            ]
        } else {
            return [
                m('span', 'Create'),
            ]
        }
    }

    view(ctrl) {
        return [
            m('h2', 'Create a resource'),
            m('p', 'Getting started with a form following.'),
            m("form", {onsubmit: this.save.bind(this)}, [
                m(".form-group", [
                    m("label", "Name (*)"),
                    m("input.form-control[placeholder='Registration count'][type='text'][required='required']", {oninput: m.withAttr('value', this.resource().name), value: this.resource().name()})
                ]),
                m(".form-group", [
                    m("label", "Initial value (*)"),
                    m("input.form-control[name='initial_value'][placeholder='861'][type='text'][required='required']", {oninput: m.withAttr('value', this.resource().initialValue), value: this.resource().initialValue()}),
                    m("p.hint", [
                        m("small", [
                            m("span", "int or string"),
                        ])
                    ])
                ]),
                m("fieldset", [
                    m("legend", "Slack"),
                    m(".form-group", [
                        m("label", "Webhook URL (*)"),
                        m("input.form-control[name='slack_webhook_url'][placeholder='https://hooks.slack.com/services/AAAA/1111/qwerty'][type='url'][pattern='^https://hooks.slack.com/.*'][required='required']", {oninput: m.withAttr('value', this.resource().slackUrl), value: this.resource().slackUrl()}),
                        m("p.hint", [
                            m("small", [
                                m("span", "should begin with "),
                                m("i", "https://hooks.slack.com/"),
                            ])
                        ])
                    ]),
                    m(".form-group", [
                        m("label", "Channel (*)"),
                        m("input.form-control[name='slack_channel'][placeholder='#monitoring'][type='text'][required='required']", {oninput: m.withAttr('value', this.resource().slackChannel), value: this.resource().slackChannel()}),
                        m("p.hint", [
                            m("small", [
                                m("span.hint", "channel to be notified"),
                            ])
                        ])
                    ]),
                    m(".form-group", [
                        m("label", "Template (*)"),
                        m("input.form-control[name='slack_template'][placeholder='Registration count is {value}'][type='text']", {oninput: m.withAttr('value', this.resource().slackTemplate), value: this.resource().slackTemplate()}),
                        m("p.hint", [
                            m("small", [
                                m("span", "body to be notified / "),
                            ]),
                            m("small", [
                                m("code", "{value}"),
                                m("span", " should be included"),
                            ])
                        ])
                    ]),
                    m(".form-group", [
                        m("label", [
                            m('span', "Icon emoji "),
                            m("small", "(optional)")
                        ]),
                        m("input.form-control[name='slack_icon_emoji'][placeholder=':smile:'][type='text']", {oninput: m.withAttr('value', this.resource().slackIconEmoji), value: this.resource().slackIconEmoji()})
                    ])
                ]),
                m("button.btn.btn-primary.btn-block[type='submit']", this.createButton())
            ]
        )]
    }
}

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-74141162-2', 'auto')
ga('send', 'pageview')

m.mount(
    document.getElementById('form'),
    new CreateForm()
)
