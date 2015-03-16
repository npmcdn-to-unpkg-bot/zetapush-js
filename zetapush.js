/*
	ZetaPushCore v1.0
	Javascript core sdk for ZetaPush
	Mikael Morvan - Mars 2015
	*/

;(function () {
	'use strict';

	/**
	 * Class for managing core functionnalities.     
	 *
	 * @class ZetaPush Manages core functionnalities
	 */
	function ZetaPush() {
	}

	// Singleton for ZetaPush core
	var zp= new ZetaPush();
	var proto = ZetaPush.prototype;
	var exports = this;
	var originalGlobalValue = exports.ZetaPush;

	var cometd = $.cometd,
	_connectionData= null,
	connected = false,
	clientId,
	subscriptions = [];

	/*
		Listeners for cometD meta channels
	*/
	cometd.addListener('/meta/connect', function(msg) {
		if (cometd.isDisconnected()) {
			connected = false;
			log.info('connection closed');
			return;
		}

		var wasConnected = connected;
		connected = msg.successful;
		if (!wasConnected && connected) { // reconnected
			log.info('connection established');
			cometd.notifyListeners('/meta/connected', msg);
			cometd.batch(function(){ 
				zp.refresh(); 
			});
		} else if (wasConnected && !connected) {
			log.warn('connection broken');
		}
	});

	cometd.addListener('/meta/handshake', function(handshake) {
		if (handshake.successful) {
			log.debug('successful handshake', handshake);
			clientId = handshake.clientId;
		}
		else {
			log.warn('unsuccessful handshake');
			clientId = null;
		}
	});

	proto.isConnected= function(){
		return cometd.isConnected();
	}
	/*
		Generate a channel
	*/
	proto.generateChannel= function(businessId, deploymentId, verb){
		return '/service/' + businessId +'/'+ deploymentId +'/'+ verb;
	}

	/*
		Listener for every ZetaPush and CometD events
	*/
	proto.on= function(evt, callback){
		var tokens= evt.split("/");
		if (tokens.length<=1){
			// TODO emit an error
			return null;
		}

		var key={};
		if (tokens[1]=='service'){
			key.isService= true;
			key.channel= evt;
			key.callback= callback;

			if (connected) {
				key.sub = cometd.subscribe(key.channel, key.callback);
				log.debug('subscribed', key);
			} else {
				log.debug('queuing subscription request', key);
			}
			subscriptions.push(key);
			if (key.renewOnReconnect==null)
				key.renewOnReconnect = true;

			return key;	
		} else if (tokens[1]=='meta'){
			key.isService= false;
			key.renewOnReconnect= false;
			key.channel= evt;
			key.callback= callback;
			key.sub= cometd.addListener(evt, callback);
		} else {
			log.error("This event can t be managed by ZetaPush", evt);
			return null;
		}
		return key;
	}
	/*
		Remove listener
	*/
	proto.off= function(key){
		if (!key || key.sub==null)
			return;

		if (key.isService){
			cometd.unsubscribe(key.sub);
			key.sub= null;
		} else {
			cometd.removeListener(key.sub);
			key.sub= null;
		}
		log.debug('unsubscribed', key);
		key.renewOnReconnect = false;
	}

	/*
		Send data
	*/
	proto.send= function(evt, data){
		var tokens= evt.split("/");
		if (tokens.length<=1){
			// todo emit an error
			return;
		}

		if (tokens[1]=='service'){
			if (connected){
				cometd.publish(evt, data);
			}
		}
	}

	/*
		Init ZetaPush with the server url
	*/
	proto.init= function(serverUrl, debugLevel){
		log.setLevel(debugLevel);
		if (debugLevel == 'debug')
			cometd.websocketEnabled= false;
		
		cometd.configure({
			url: serverUrl,
			logLevel: debugLevel,
			backoffIncrement: 100,
			maxBackoff: 500,
			appendMessageTypeToURL: false
		});
	}
	/*
		Disconnect ZetaPush
	*/
	proto.disconnect= function() {
		cometd.disconnect(true);
	}

	// http://cometd.org/documentation/cometd-javascript/subscription
	cometd.onListenerException = function(exception, subscriptionHandle, isListener, message) {
		log.error('Uncaught exception for subscription', subscriptionHandle, ':', exception, 'message:', message);
		if (isListener) {
			cometd.removeListener(subscriptionHandle);
			log.error('removed listener');
		} else {
			cometd.unsubscribe(subscriptionHandle);
			log.error('unsubscribed');
		}
		disconnect();
	};

	/*
		Refresh subscriptions
	*/
	proto.refresh= function() {		
		log.debug('refreshing subscriptions');
		var renew = [];
		subscriptions.forEach(function(key) {
			if (key.sub && key.isService)
				cometd.unsubscribe(key.sub);
			if (key.renewOnReconnect)
				renew.push(key);
		});
		subscriptions = [];
		renew.forEach(function(key) {
			proto.on(key.channel, key.callback);
		});		
	};
	
	// Make an Text ID so the localStorage will be filled by something
	proto.makeResourceId= function()
	{
		var text = "";
		var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 5; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		localStorage['resource']= text;
	}

	/*
		Connect to ZetaPush
		connectionData must be given by a Authent Object
	*/
	proto.connect= function(connectionData){

		_connectionData= connectionData;
		
		cometd.handshake(connectionData);	
	};	

	/*
		Reconnect
	*/
	proto.reconnect= function(){
		connect(_connectionData);		
	}

	/**
	 * Reverts the global {@link ZetaPush} to its previous value and returns a reference to this version.
	 *
	 * @return {Function} Non conflicting ZetaPush class.
	 */
	ZetaPush.noConflict = function noConflict() {
		exports.ZetaPush = originalGlobalValue;
		return zp;
	};

	// Expose the class either via AMD, CommonJS or the global object
	if (typeof define === 'function' && define.amd) {
		define(function () {
			return zp;
		});
	}
	else if (typeof module === 'object' && module.exports){
		module.exports = zp;
	}
	else {
		exports.zetaPush = zp;
	}
}.call(this));
