
var Purest = require('../../')
  , providers = require('../../config/providers')


function error (err, done) {
  return (err instanceof Error)
    ? done(err)
    : (console.log(err) || done(new Error('Error response!')))
}

require('../utils/credentials')
var app = require('../../config/app')
  , user = require('../../config/user')

var p = {}
for (var name in providers) {
  var options = {
    provider:name,
    defaults:{headers:{'User-Agent':'Purest'}}
  }
  if (app[name] && user[name] && user[name].token && user[name].secret) {
    options.key = app[name].key
    options.secret = app[name].secret
  }
  p[name] = new Purest(options)
}


describe('absolute url', function () {
  it('...', function (done) {
    p.aboutme.get('https://api.about.me/api/v2/json/user/view/simeonv', {
      headers:{Authorization:'Basic '+user.aboutme.apikey}
    }, function (err, res, body) {
      debugger
      if (err) return error(err, done)
      body.user_name.should.equal('simeonv')
      done()
    })
  })
})

describe('request defaults', function () {
  it('...', function (done) {
    var defaults = {
      oauth: {
        consumer_key:app.twitter.key,
        consumer_secret:app.twitter.secret,
        token:user.twitter.token,
        token_secret:user.twitter.secret
      }
    }
    var twitter = new Purest({provider:'twitter', defaults:defaults})
    twitter.query()
      .select('users/show')
      .where({screen_name:'mightymob'})
      .request(function (err, res, body) {
        debugger
        if (err) return error(err, done)
        body.id.should.equal(1504092505)
        body.screen_name.should.equal('mightymob')
        done()
      })
  })
})

describe('request debug', function () {
  it('...', function (done) {
    var facebook = new Purest({provider:'facebook', debug:true})
    facebook.query()
      .select('me')
      .auth(user.facebook.token)
      .request(function (err, res, body) {
        debugger
        if (err) return error(err, done)

        done()
      })
  })
})

describe('http options request', function () {
  it('...', function (done) {
    p.yahoo.get('yql', {
      api:'yql',
      method:'OPTIONS',
      oauth:{
        token:user.yahoo.token, secret:user.yahoo.secret
      }
    }, function (err, res, body) {
      if (err) return error(err, done)
      res.headers.allow
        .should.equal('GET, HEAD, POST, PUT, DELETE, TRACE, OPTIONS')
      done()
    })
  })
})
