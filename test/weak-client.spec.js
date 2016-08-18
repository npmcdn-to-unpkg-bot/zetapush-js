describe('WeakClient',  function () {
  var sandboxId = 'Y1k3xBDc'

  beforeEach(function () {
    this.client = new ZetaPush.WeakClient({
      sandboxId: sandboxId
    })
  })

  describe('WeakClient initial state',  function () {
    it('Should correctly create a WeakClient object', function () {
      expect(typeof this.client).toBe('object')
      expect(this.client instanceof ZetaPush.WeakClient).toBeTruthy()
    })

    it('Should not be connected', function () {
      expect(this.client.isConnected()).toBeFalsy()
    })

    it('Should have a nul userId', function () {
      expect(this.client.getUserId()).toBeNull()
    })

    it('Should have a correct sandboxId', function () {
      expect(this.client.getSandboxId()).toBe(sandboxId)
    })
  })

  describe('WeakClient connection',  function () {
    it('Should connect', function (done) {
      var client = this.client
      client.onConnectionEstablished(function () {
        expect(client.isConnected()).toBeTruthy()
        done()
      })
      client.connect()
    })
  })

  describe('WeakClient deconnection',  function () {
    it('Should connect and disconnect', function (done) {
      var client = this.client
      client.addConnectionStatusListener({
        onConnectionEstablished: function () {
          expect(client.isConnected()).toBeTruthy()
          client.disconnect()
        },
        onConnectionClosed: function () {
          expect(client.isConnected()).toBeFalsy()
          done()
        }
      })
      client.connect()
    })
  })

  describe('WeakClient session persistence', function () {
    it('Should keep user session between connections', function (done) {
      var client = this.client
      var sessions = []
      client.addConnectionStatusListener({
        onConnectionEstablished: function () {
          expect(client.isConnected()).toBeTruthy()
          if (sessions.length < 2) {
            client.disconnect()
          }
          else {
            var first = sessions[0]
            var second = sessions[1]
            expect(first.userId).toBeDefined()
            expect(second.userId).toBeDefined()
            expect(first.userId).toBe(second.userId)
            done()
          }
        },
        onConnectionClosed: function () {
          expect(client.isConnected()).toBeFalsy()
          if (sessions.length < 2) {
            client.connect()
          }
        },
        onSuccessfulHandshake: function (session) {
          sessions.push(session)
        }
      })
      client.connect()
    })
  })

})