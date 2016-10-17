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

class CategoriesList extends Component {
    init(ctrl) {
    }

    view(ctrl) {
        return m('div.search.m-b-3', Object.keys(this.props).sort().map(category => {
            return m(`a.search__btn.btn.btn-secondary.btn-sm[role='button'][href='#${category}']`, category)
        }))
    }
}

class RepositoriesList extends Component {
    init(ctrl) {
    }

    view(ctrl) {
        let categories = this.props

        return (
            m('div', {}, Object.keys(categories).sort().map(category => {
                let repos = categories[category].sort((a, b) => b.stargazers_count - a.stargazers_count)
                return m('div.category.m-b-2', {}, [
                    m(`h3#${category}`, {}, [
                        category,
                        m('a.pull-xs-right.text-muted.category__back-to-top', {href: '#categories'}, m.trust("&#11014;"))
                    ]),
                    m('div.list-group', {}, repos.map(repo => {
                        return m('a.list-group-item.category__repo', {href: `https://github.com/${repo.path}`, target: "_blank", rel: "noopener noreferrer"}, [
                            m('span.category__repo__tag.tag.tag-default.tag-pill.pull-xs-right', {}, repo.stargazers_count),
                            m('strong', {}, repo.name),
                            m.trust("&nbsp;"),
                            m('span.category__repo__description', {}, repo.description)
                        ])
                    }))
                ])
            }))
        )
    }
}

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-74141162-2', 'auto')
ga('send', 'pageview')

let contentElement = document.getElementById('contents')
if (contentElement) {
    let jsonURL = contentElement.dataset.url

    m.request({method: "GET", url: jsonURL}).then(repositories => {
        let categories = {}
        repositories.forEach(repo => {
            if (!categories[repo.category1]) {
                categories[repo.category1] = []
            }
            categories[repo.category1].push(repo)
        })

        m.mount(
            document.getElementById('search-categories'),
            new CategoriesList(categories)
        )

        m.mount(
            contentElement,
            new RepositoriesList(categories)
        )
    })
}
