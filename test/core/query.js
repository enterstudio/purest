
var should = require('should')
var Purest = require('../../')
  , Query = require('../../lib/query')
var query = require('../../config/query')


describe('query default aliases', function () {
  var provider = null
  before(function () {
    provider = new Purest({provider:'box'})
  })
  it('verbs', function () {
    function assert (method, alias) {
      var q = provider.query()[alias]('endpoint')
      q.method.should.equal((method == 'delete') ? 'del' : method)
    }
    Object.keys(query.verbs).forEach(function (verb) {
      assert(verb, verb)
      query.verbs[verb].forEach(function (alias) {
        assert(verb, alias)
      })
    })
  })
  it('options', function () {
    function assert (method, option) {
      var data = (option == 'multipart') ? [{key:'value'}] : {key:'value'}
      var q = provider.query()[method](data)
      ;(option == 'options')
        ? q._options.key.should.equal('value')
        : should.deepEqual(q._options[option], data)
    }
    Object.keys(query.options).forEach(function (option) {
      assert(option, option)
      query.options[option].forEach(function (alias) {
        assert(alias, option)
      })
    })
  })
})

describe('query custom aliases', function () {
  it('verbs only', function () {
    var methods = {verbs:{get:['loot'], post:['write']}}
      , provider = new Purest({provider:'box', methods:methods})

    var q = provider.query().loot('endpoint')
    q.method.should.equal('get')

    q = provider.query().write('endpoint')
    q.method.should.equal('post')
  })
  it('all', function () {
    var methods = {
      verbs:{get:['loot'], post:['write']},
      options:{qs:['params']},
      custom:{request:['submit']}
    }
    var provider = new Purest({provider:'box', methods:methods})

    var q = provider.query().loot('endpoint')
    q.method.should.equal('get')
    q = provider.query().write('endpoint')
    q.method.should.equal('post')

    q = provider.query().params({key:'value'})
    should.deepEqual(q._options.qs, {key:'value'})

    provider._request = function (url, options, callback) {
      callback(null, {headers:{}}, true)
    }
    q = provider.query().get('endpoint').submit(function (err, res, body) {
      should.equal(body, true)
    })
  })
})

describe('query methods', function () {
  var provider = null
  before(function () {
    provider = new Purest({provider:'box'})
  })
  it('config', function () {
    provider.query().should.be.instanceOf(Query)
  })
  it('get', function () {
    var query = provider.query().get('endpoint')
    query.endpoint.should.equal('endpoint')
  })
  it('qs', function () {
    var query = provider.query().qs({some:'data'})
    should.deepEqual(query._options, {api:'__default', qs:{some:'data'}})
  })
  it('form', function () {
    var query = provider.query().form({some:'data'})
    should.deepEqual(query._options, {api:'__default', form:{some:'data'}})
  })
  it('override & extend', function () {
    var query = provider.query()
      .form({some:'data1'})
      .qs({some:'data1'})
      .form({some:'data2', some2:'data3'})
    should.deepEqual(query._options, {
      api:'__default',
      form: {some:'data2', some2:'data3'},
      qs: {some:'data1'}
    })
  })
})

describe('query auth', function () {
  var fixture = {
    custom: {
      __provider: {
        oauth: true,
        refresh: '',
        docs: ''
      },
      'https://domain1.com': {
        __domain: {
          auth: {qs:{access_token:'[0]'}}
        },
        'path1': {
          __path: {
            alias: '__default',
            version: 'v3'
          }
        },
        'path2': {
          __path: {
            alias: ['alias1'],
            version: 'v3',
            auth: {headers:{Authorization:'Token [0]'}}
          }
        }
      },
      'https://domain2.com': {
        __domain: {
          auth: [
            {auth: {bearer: '[0]'}},
            {auth: {user:'[0]', pass:'[1]'}}
          ]
        },
        'path1': {
          __path: {
            alias: ['alias2']
          },
          'endpoint': {
            __endpoint: {
              auth: {oauth:{token:'[0]', secret:'[1]'}}
            }
          }
        }
      },
      'https://domain3.com': {
        __domain: {
          auth: {
            qs: {api_key:'[0]'},
            headers: {Authorization:'Basic [1]'}
          }
        },
        'path1': {
          __path: {
            alias: ['alias3']
          }
        },
        'path2': {
          __path: {
            alias: ['alias4'],
            auth: [
              {qs: {api_key:'[0]'}},
              {
                qs: {api_key:'[0]'},
                headers: {Authorization:'OAuth [1]'}
              }
            ]
          }
        }
      }
    }
  }

  it('__domain auth', function () {
    var provider = new Purest({provider:'custom', config:fixture})
    var query = provider.query().auth('token')
    should.deepEqual(query._options,
      {api:'__default', qs:{access_token:'token'}})
    should.deepEqual(query.api.auth,
      {qs:{access_token:'[0]'}})
  })
  it('__path auth', function () {
    var provider = new Purest({provider:'custom', config:fixture})
    var query = provider.query('alias1').auth('token')
    should.deepEqual(query._options,
      {api:'alias1', headers:{Authorization:'Token token'}})
    should.deepEqual(query.api.auth,
      {headers:{Authorization:'Token [0]'}})
  })
  it('__endpoint auth', function () {
    var provider = new Purest({provider:'custom', config:fixture})
    var query = provider.query('alias2').get('endpoint').auth('token','secret')
    should.deepEqual(query._options,
      {api:'alias2', oauth:{token:'token',secret:'secret'}})

    should.deepEqual(query.api.auth, [
      {auth:{bearer:'[0]'}}, {auth:{user:'[0]',pass:'[1]'}}
    ])

    should.deepEqual(query.api.endpoints.str.endpoint.__endpoint, {
      auth: {oauth:{token:'[0]',secret:'[1]'}}
    })
  })

  it('array auth', function () {
    var provider = new Purest({provider:'custom', config:fixture})

    var query = provider.query('alias2').auth('token')
    should.deepEqual(query._options,
      {api:'alias2', auth:{bearer:'token'}})

    var query = provider.query('alias2').auth('user', 'pass')
    should.deepEqual(query._options,
      {api:'alias2', auth:{user:'user',pass:'pass'}})

    should.deepEqual(query.api.auth, [
      {auth:{bearer:'[0]'}}, {auth:{user:'[0]',pass:'[1]'}}
    ])
  })
  it('objects auth', function () {
    var provider = new Purest({provider:'custom', config:fixture})

    var query = provider.query('alias3').auth('apikey', 'token')
    should.deepEqual(query._options,
      {api:'alias3', qs:{api_key:'apikey'}, headers:{Authorization:'Basic token'}})

    should.deepEqual(query.api.auth, {
      qs: {api_key:'[0]'},
      headers: {Authorization:'Basic [1]'}
    })
  })
  it('array and objects auth', function () {
    var provider = new Purest({provider:'custom', config:fixture})

    var query = provider.query('alias4').auth('token')
    should.deepEqual(query._options,
      {api:'alias4', qs:{api_key:'token'}})

    var query = provider.query('alias4').auth('apikey', 'token')
    should.deepEqual(query._options,
      {api:'alias4', qs:{api_key:'apikey'}, headers:{Authorization:'OAuth token'}})

    should.deepEqual(query.api.auth, [
      {qs:{api_key:'[0]'}}, {qs:{api_key:'[0]'}, headers:{Authorization:'OAuth [1]'}}
    ])
  })
})
