/*
	ZetaPushCore v1.0
	Javascript core sdk for ZetaPush
	Mikael Morvan - March 2015
*/

// Global NameSpace
ZetaPush = {};
ZetaPush.service= {};
ZetaPush.authent={};

;(function () {
	'use strict';

	/**
	 * Class for managing core functionnalities.     
	 *
	 * @class ZetaPush Manages core functionnalities
	 */
	function ZP() {
	}

	// Singleton for ZetaPush core
	var _zp= new ZP();
	var proto = ZP.prototype;
	var exports = this;
	var originalGlobalValue = exports.ZP;

	var cometd = $.cometd,
	_connectionData= null,
	connected = false,
	_businessId= null,
	_clientId= null,
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
				_zp.refresh(); 
			});
		} else if (wasConnected && !connected) {
			log.warn('connection broken');
		}
	});

	cometd.addListener('/meta/handshake', function(handshake) {
		if (handshake.successful) {
			log.debug('successful handshake', handshake);
			_clientId = handshake.clientId;
		}
		else {
			log.warn('unsuccessful handshake');
			_clientId = null;
		}
	});

	proto.isConnected= function(){
		return !cometd.isDisconnected();
	}
	/*
		Generate a channel
	*/
	proto.generateChannel= function(deploymentId, verb){
		return '/service/' + _businessId +'/'+ deploymentId +'/'+ verb;
	}

	/*
		Generate a channel
	*/
	proto.generateMetaChannel= function( deploymentId, verb){
		return '/meta/' + _businessId +'/'+ deploymentId +'/'+ verb;
	}

	/*
		Listener for every ZetaPush and CometD events

		Args:
		1 argument: a previous key (for refresh)
		2 arguments: a topic and a callback
		4 arguments: businessId, deploymentId, verb and callback
	*/
	proto.on= function(businessId, deploymentId, verb, callback){
		// One can call the function with a key
		if (arguments.length== 1){
			var key= arguments[0];
		}
		else if (arguments.length == 2){			
			var key={};			
			key.channel= arguments[0];
			key.callback= arguments[1];
			subscriptions.push(key);
		} else if (arguments.length == 4) {
			var key={};
			key.channel= proto.generateChannel(businessId, deploymentId, verb);
			key.callback= callback;
			subscriptions.push(key);
		} else{
			throw "zetaPush.on - bad arguments";
		}

		var tokens= key.channel.split("/");
		if (tokens.length<=1){
			cometd.notifyListeners('/meta/error', "Syntax error in the channel name");
			return null;
		}
		
		if (tokens[1]=='service'){
			key.isService= true;

			if (connected) {
				key.sub = cometd.subscribe(key.channel, key.callback);
				log.debug('subscribed', key);
			} else {
				log.debug('queuing subscription request', key);
			}

		} else if (tokens[1]=='meta'){
			key.isService= false;
			key.sub= cometd.addListener(key.channel, key.callback);
		} else {
			log.error("This event can t be managed by ZetaPush", evt);
			return null;
		}
		if (key.renewOnReconnect==null)
			key.renewOnReconnect = true;

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
		3 params
		businessId, deploymentId, verb (no data)
		4 params
		businessId, deploymentId, verb, data
		2 params
		channel, data
	*/
	proto.send= function(businessId, deploymentId, verb, data){

		var evt, sendData;

		if ((arguments.length== 2) || (arguments.length==1)){
			evt= arguments[0];
			sendData= arguments[1];
		} 
		else if ((arguments.length==3) || (arguments.length==4)){
			evt= proto.generateChannel(businessId, deploymentId, verb);
			sendData= data;
		}

		var tokens= evt.split("/");
		if (tokens.length<=1){
			cometd.notifyListeners('/meta/error', "Syntax error in the channel name");
			return;
		}

		if (tokens[1]=='service'){
			if (connected){
				cometd.publish(evt, sendData);
			}
		} 
		else if (tokens[1]=='meta'){
			cometd.notifyListeners(evt, sendData);
		}
	}

	/*
		Init ZetaPush with the server url
	*/
	proto.init= function(serverUrl, businessId, debugLevel){
		_businessId= businessId;

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
			if (key.sub){
				if (key.isService)
					cometd.unsubscribe(key.sub)
				else
					cometd.removeListener(key.sub);
			}
			if (key.renewOnReconnect)
				renew.push(key);
		});
		//subscriptions = [];
		renew.forEach(function(key) {
			//proto.on(key.channel, key.callback);
			proto.on(key);
		});		
	};

	/*
		Make a new Resource ID
		Store it in localStorage
	*/
	proto.makeResourceId= function()
	{
		var text = "";
		var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 5; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}

	/*
		Connect to ZetaPush
		connectionData must be given by an Authent Object
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

	/*
		getBusinessId
	*/
	proto.getBusinessId= function(){
		return _businessId;
	}

	/**
	 * Reverts the global {@link ZetaPush} to its previous value and returns a reference to this version.
	 *
	 * @return {Function} Non conflicting ZetaPush class.
	 */
	ZP.noConflict = function noConflict() {
		exports.ZP = originalGlobalValue;
		return _zp;
	};

	// Expose the class either via AMD, CommonJS or the global object
	if (typeof define === 'function' && define.amd) {
		define(function () {
			return _zp;
		});
	}
	else if (typeof module === 'object' && module.exports){
		module.exports = _zp;
	}
	else {
		exports.zp = _zp;
	}
}.call(this));
