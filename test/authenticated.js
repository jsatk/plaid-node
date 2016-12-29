'use strict';

/* global describe, it */

var assert = require('assert');

var R = require('ramda');
var proxyquire = require('proxyquire');

var eq = assert.strictEqual;

var Plaid = require('../');


describe('Plaid.Client', function() {

  it('throws for missing client_id', function(done) {
    assert.throws(function() {
      Plaid.Client(null, 'secret', Plaid.environments.tartan);
    }, Error);
    done();
  });

  it('throws for missing secret', function(done) {
    assert.throws(function() {
      Plaid.Client('client_id', null, Plaid.environments.tartan);
    }, Error);
    done();
  });

  it('throws for invalid environment', function(done) {
    assert.throws(function() {
      Plaid.Client('client_id', 'secret', 'foo');
    }, Error);
    done();
  });

});

describe('Plaid Client - Balance', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('returns account balances', function(done) {
    client.getBalance('test_chase', function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));

      done();
    });
  });
});

describe('Plaid Client - Exchange Token', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('returns an access_token', function(done) {
    client.exchangeToken('test,chase,connected', null, function(err, res) {
      eq(err, null);

      eq(res.access_token, 'test_chase');

      done();
    });
  });

  it('does not require an account_id parameter', function(done) {
    client.exchangeToken('test,chase,connected', function(err, res) {
      eq(err, null);

      eq(res.access_token, 'test_chase');

      done();
    });
  });
});

describe('Plaid Client - Upgrade', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('does not require an options parameter',
    function(done) {
    client.upgradeUser('test_chase', 'info', function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('info', res));
      done();
    });
  });

  it('upgrades a user successfully', function(done) {
    client.upgradeUser('test_chase', 'connect', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));

      done();
    });
  });
});

describe('Plaid.Client - Auth', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  // Mocked client simulates connection failures
  var mocked_plaid = proxyquire('../', {
    request: function(body, callback) {
      callback(new Error('foobar'));
    },
  });
  var mocked_client = new mocked_plaid.Client(
    'test_id', 'test_secret', Plaid.environments.tartan);

  it('Plaid.Client.addAuthUser returns accounts for a non-MFA user',
    function(done) {
    client.addAuthUser('wells', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      done();
    });

  });

  it('Plaid.Client.addAuthUser returns plaid errors as the "err" ' +
     'arg to callback', function(done) {
    client.addAuthUser('wells', {
      username: 'plaid_test',
      password: 'plaid_locked',
    }, {}, function(err, mfa, res) {
      eq(mfa, null);
      eq(res, null);

      eq(err.code, 1205);
      eq(err.message, 'account locked');
      done();
    });

  });

  it('Plaid.Client.addAuthUser does not require an options parameter',
    function(done) {
    client.addAuthUser('wells', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      done();
    });

  });

  it('Plaid.Client.addAuthUser returns questions for a MFA question user',
    function(done) {
    client.addAuthUser('bofa', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'questions');

      done();
    });

  });

  it('Plaid.Client.addAuthUser returns selections for a MFA selections user',
    function(done) {
    client.addAuthUser('citi', {
      username: 'plaid_selections',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'selections');

      done();
    });

  });

  it('Plaid.Client.addAuthUser returns list of send_methods for a MFA ' +
     'device user when options.list === true', function(done) {
    client.addAuthUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {
      list: true,
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'list');

      done();
    });

  });

  it('Plaid.Client.addAuthUser returns a code sent message for MFA device ' +
     'user when options.list !== true', function(done) {
    client.addAuthUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.addAuthUser gracefully handles connection errors',
    function(done) {
    mocked_client.addAuthUser('bofa', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfaRes, res) {
      eq(mfaRes, null);
      eq(res, null);

      eq(err.toString(), 'Error: foobar');

      done();
    });
  });

  it('Plaid.Client.stepAuthUser accepts a send_method in options',
    function(done) {
    client.stepAuthUser('test_chase', '', {
      send_method: {type: 'phone'},
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepAuthUser does not require an options parameter',
    function(done) {
    client.stepAuthUser('test_bofa', 'tomato', function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));

      done();
    });
  });


  it('Plaid.Client.stepAuthUser returns accounts for valid ' +
     'MFA question answer', function(done) {
    client.stepAuthUser('test_bofa', 'tomato', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));

      done();
    });
  });

  it('Plaid.Client.stepAuthUser returns accounts for valid MFA code answer',
    function(done) {
    client.stepAuthUser('test_chase', '1234', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));

      done();
    });
  });

  it('Plaid.Client.stepAuthUser returns accounts for valid ' +
     'MFA selections answers', function(done) {
    client.stepAuthUser('test_citi', JSON.stringify([
      'tomato',
      'ketchup',
    ]), {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));

      done();
    });
  });

  it('Plaid.Client.getAuthUser gracefully handles connection errors',
    function(done) {
    mocked_client.getAuthUser('test_bofa', {}, function(err, res) {
      eq(res, null);

      eq(err.toString(), 'Error: foobar');

      done();
    });
  });

  it('Plaid.Client.getAuthUser returns accounts',
    function(done) {
    client.getAuthUser('test_chase', {}, function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));

      done();
    });
  });

  it('Plaid.Client.getAuthUser returns a plaid error as the ' +
     '"err" arg to callback', function(done) {
    client.getAuthUser('foo', {}, function(err, res) {
      eq(res, null);

      eq(err.code, 1105);
      eq(err.message, 'bad access_token');

      done();
    });
  });

  it('Plaid.Client.getAuthUser does not require an options paramter',
    function(done) {
    client.getAuthUser('test_chase', function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));

      done();
    });
  });

  it('Plaid.Client.patchAuthUser patches a user', function(done) {
    client.patchAuthUser('test_chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.patchAuthUser does not require an options parameter',
    function(done) {
    client.patchAuthUser('test_chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.deleteAuthUser deletes a user', function(done) {
    client.deleteAuthUser('test_chase', {}, function(err, res) {
      eq(err, null);

      eq(res.message, 'Successfully removed from your account');

      done();
    });
  });

  it('Plaid.Client.deleteAuthUser does not require an options parameter',
    function(done) {
    client.deleteAuthUser('test_chase', function(err, res) {
      eq(err, null);

      eq(res.message, 'Successfully removed from your account');

      done();
    });
  });

});

describe('Plaid.Client - Connect', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('Plaid.Client.addConnectUser returns accounts and transactions ' +
     'for a non-MFA user', function(done) {
    client.addConnectUser('wells', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('transactions', res));

      done();
    });

  });

  it('Plaid.Client.addConnectUser returns questions for a MFA question user',
    function(done) {
    client.addConnectUser('bofa', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'questions');

      done();
    });

  });

  it('Plaid.Client.addConnectUser returns selections for a MFA ' +
     'selections user', function(done) {
    client.addConnectUser('citi', {
      username: 'plaid_selections',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'selections');

      done();
    });

  });

  it('Plaid.Client.addConnectUser returns list of send_methods for a ' +
     'MFA device user when options.list === true', function(done) {
    client.addConnectUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {
      list: true,
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'list');

      done();
    });

  });

  it('Plaid.Client.addConnectUser returns a code sent message for ' +
     'MFA device user when options.list !== true', function(done) {
    client.addConnectUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepConnectUser accepts a send_method in options',
    function(done) {
    client.stepConnectUser('test_chase', '', {
      send_method: {type: 'phone'},
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepConnectUser returns accounts and transactions for' +
     'valid MFA question answer', function(done) {
    client.stepConnectUser('test_bofa', 'tomato', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('transactions', res));

      done();
    });
  });

  it('Plaid.Client.stepConnectUser returns accounts and transactions for ' +
     'valid MFA code answer', function(done) {
    client.stepConnectUser('test_chase', '1234', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('transactions', res));

      done();
    });
  });

  it('Plaid.Client.stepConnectUser returns accounts and transactions for ' +
     'valid MFA selections answers', function(done) {
    client.stepConnectUser('test_citi', JSON.stringify([
      'tomato',
      'ketchup',
    ]), {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('transactions', res));

      done();
    });
  });

  it('Plaid.Client.getConnectUser returns accounts and transactions',
    function(done) {
    client.getConnectUser('test_chase', {}, function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));
      assert(R.has('transactions', res));

      done();
    });
  });

  it('Plaid.Client.patchConnectUser patches a user', function(done) {
    client.patchConnectUser('test_chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.deleteConnectUser deletes a user', function(done) {
    client.deleteConnectUser('test_chase', {}, function(err, res) {
      eq(err, null);

      eq(res.message, 'Successfully removed from your account');

      done();
    });
  });

});

describe('Plaid.Client - Income', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('Plaid.Client.addIncomeUser returns accounts and income for a  ' +
     'non-MFA user', function(done) {
    client.addIncomeUser('wells', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('income', res));

      done();
    });

  });

  it('Plaid.Client.addIncomeUser returns questions for a MFA question user',
    function(done) {
    client.addIncomeUser('bofa', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'questions');

      done();
    });

  });

  it('Plaid.Client.addIncomeUser returns list of send_methods for a ' +
     'MFA device user when options.list === true', function(done) {
    client.addIncomeUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {
      list: true,
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'list');

      done();
    });

  });

  it('Plaid.Client.addIncomeUser returns a code sent message for MFA device ' +
     'user when options.list !== true', function(done) {
    client.addIncomeUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepIncomeUser accepts a send_method in options',
    function(done) {
    client.stepIncomeUser('test_chase', '', {
      send_method: {type: 'phone'},
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepIncomeUser returns accounts and income for ' +
     'valid MFA question answer', function(done) {
    client.stepIncomeUser('test_bofa', 'tomato', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('income', res));

      done();
    });
  });

  it('Plaid.Client.stepIncomeUser returns accounts and income for ' +
     'valid MFA code answer', function(done) {
    client.stepIncomeUser('test_chase', '1234', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('income', res));

      done();
    });
  });

  it('Plaid.Client.getIncomeUser returns accounts and income',
    function(done) {
    client.getIncomeUser('test_chase', {}, function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));
      assert(R.has('income', res));

      done();
    });
  });

  it('Plaid.Client.patchIncomeUser patches a user', function(done) {
    client.patchIncomeUser('test_chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.deleteIncomeUser deletes a user', function(done) {
    client.deleteIncomeUser('test_chase', {}, function(err, res) {
      eq(err, null);

      eq(res.message, 'Successfully removed from your account');

      done();
    });
  });

});

describe('Plaid.Client - Info', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('Plaid.Client.addInfoUser returns accounts and info for a non-MFA user',
    function(done) {
    client.addInfoUser('wells', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('info', res));

      done();
    });

  });

  it('Plaid.Client.addInfoUser returns questions for a MFA question user',
    function(done) {
    client.addInfoUser('bofa', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'questions');

      done();
    });

  });

  it('Plaid.Client.addInfoUser returns list of send_methods for a ' +
     'MFA device user when options.list === true', function(done) {
    client.addInfoUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {
      list: true,
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'list');

      done();
    });

  });

  it('Plaid.Client.addInfoUser returns a code sent message for MFA device ' +
     'user when options.list !== true', function(done) {
    client.addInfoUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepInfoUser accepts a send_method in options',
    function(done) {
    client.stepInfoUser('test_chase', '', {
      send_method: {type: 'phone'},
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepInfoUser returns accounts and info for ' +
     'valid MFA question answer', function(done) {
    client.stepInfoUser('test_bofa', 'tomato', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('info', res));

      done();
    });
  });

  it('Plaid.Client.stepInfoUser returns accounts and info for ' +
     'valid MFA code answer', function(done) {
    client.stepInfoUser('test_chase', '1234', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      assert(R.has('info', res));

      done();
    });
  });

  it('Plaid.Client.getInfoUser returns accounts and info',
    function(done) {
    client.getInfoUser('test_chase', {}, function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));
      assert(R.has('info', res));

      done();
    });
  });

  it('Plaid.Client.patchInfoUser patches a user', function(done) {
    client.patchInfoUser('test_chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.deleteInfoUser deletes a user', function(done) {
    client.deleteInfoUser('test_chase', {}, function(err, res) {
      eq(err, null);

      eq(res.message, 'Successfully removed from your account');

      done();
    });
  });

});

describe('Plaid.Client - Risk', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  it('Plaid.Client.addRiskUser returns accounts and risk for a  ' +
     'non-MFA user', function(done) {
    client.addRiskUser('wells', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      R.forEach(R.pipe(R.has('risk'), assert), res.accounts);

      done();
    });

  });

  it('Plaid.Client.addRiskUser returns questions for a MFA question user',
    function(done) {
    client.addRiskUser('bofa', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'questions');

      done();
    });

  });

  it('Plaid.Client.addRiskUser returns list of send_methods for a ' +
     'MFA device user when options.list === true', function(done) {
    client.addRiskUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {
      list: true,
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'list');

      done();
    });

  });

  it('Plaid.Client.addRiskUser returns a code sent message for MFA device ' +
     'user when options.list !== true', function(done) {
    client.addRiskUser('chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepRiskUser accepts a send_method in options',
    function(done) {
    client.stepRiskUser('test_chase', '', {
      send_method: {type: 'phone'},
    }, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.stepRiskUser returns accounts and risk for ' +
     'valid MFA question answer', function(done) {
    client.stepRiskUser('test_bofa', 'tomato', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      R.forEach(R.pipe(R.has('risk'), assert), res.accounts);

      done();
    });
  });

  it('Plaid.Client.stepRiskUser returns accounts and risk for ' +
     'valid MFA code answer', function(done) {
    client.stepRiskUser('test_chase', '1234', {}, function(err, mfa, res) {
      eq(err, null);
      eq(mfa, null);

      assert(R.has('accounts', res));
      R.forEach(R.pipe(R.has('risk'), assert), res.accounts);

      done();
    });
  });

  it('Plaid.Client.getRiskUser returns accounts and risk',
    function(done) {
    client.getRiskUser('test_chase', {}, function(err, res) {
      eq(err, null);

      assert(R.has('accounts', res));
      R.forEach(R.pipe(R.has('risk'), assert), res.accounts);

      done();
    });
  });

  it('Plaid.Client.patchRiskUser patches a user', function(done) {
    client.patchRiskUser('test_chase', {
      username: 'plaid_test',
      password: 'plaid_good',
    }, {}, function(err, mfa, res) {
      eq(err, null);
      eq(res, null);

      eq(mfa.type, 'device');

      done();
    });
  });

  it('Plaid.Client.deleteRiskUser deletes a user', function(done) {
    client.deleteRiskUser('test_chase', {}, function(err, res) {
      eq(err, null);

      eq(res.message, 'Successfully removed from your account');

      done();
    });
  });

});

describe('Plaid.Client - Longtail Institutions', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  // The /institutions/longtail endpoint requires additional permissions
  // to access. Accessing it with the sandbox client ID and secret returns
  // an error, which we test here.
  it('Plaid.Client.getLongtailInstitutions returns institutions',
    function(done) {
    client.getLongtailInstitutions({}, function(err, res) {
      eq(err, null);

      eq(R.type(res.results), 'Array');
      eq(R.type(res.total_count), 'Number');

      done();
    });
  });

});

describe('Plaid.Client - All Institutions', function() {
  var client =
    new Plaid.Client('test_id', 'test_secret', Plaid.environments.tartan);

  // The /institutions/all endpoint requires additional permissions
  // to access. Accessing it with the sandbox client ID and secret returns
  // an error, which we test here.
  it('Plaid.Client.getAllInstitutions returns institutions',
    function(done) {
    client.getAllInstitutions({}, function(err, res) {
      eq(err, null);

      eq(R.type(res.results), 'Array');
      eq(R.type(res.total_count), 'Number');

      done();
    });
  });

});
