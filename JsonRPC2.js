//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
//--------------------------------------------------------------
var JsonRPC = new function() {
  var URL = '';
  var application = '';
  var cache= false;
  var ver = '2.0';
  var sessID = '';
  var params = [];
  var HTTPuser = undefined;
  var HTTPpasswd = undefined;
  //----------------
  var History = {};
  var callbacks = {};
  var onSuccess = false; //function() {alert("JsonRPC: request successful.")};
  var onError   = function(XR,txtStatus) {alert("JsonRPC: request FAILED!\n"+txtStatus)};
  var onComplete= false; //function() {alert("JsonRPC: complete...")};
  //----------------
  function err(err) { alert("JsonRPC: Call error!\n"+err); return false; }
  //----------------
  function construct(){ 
        this.getParams = function() { return params; }
        this.getParamsType = function() { return typeof params; }
        this.getHistoryList = function() { 
	  var keys = [];
	  for (var i in History) {
	    keys.push(i);
	  }
	  return keys;
	}
        this.getHistoryItem = function(sss) { return History[sss]; }
        this.getHistoryStatus = function(sss) { return History[sss] ? History[sss].ready : undefined; }
        this.config = function(init) {
	  URL       = init.URL ? init.URL : URL;
	  ver       = init.version ? init.version : ver;
	  cache     = init.cache ? true : false;
	  HTTPuser  = init.username ? init.username : undefined;
	  HTTPpasswd= init.password ? init.password : undefined;
	  if (typeof init.callbacks == 'object' && init.callbacks) {
	    for (var i in init.callbacks) {
	      callbacks[i] = {
	        onSuccess: typeof init.callbacks[i].onSuccess == 'function' ? init.callbacks[i].onSuccess : undefined,
	        onError: typeof init.callbacks[i].onError == 'function' ? init.callbacks[i].onError : undefined,
	        onComplete: typeof init.callbacks[i].onComplete == 'function' ? init.callbacks[i].onComplete : undefined
	      }
	    }
	  }
        };
	this.call = function(app,pp,opts) {
	  if (app && typeof app == 'string') { application = app; } else { return err("Invalid Application name!"); }
	  if (! pp ) { 
	    return err("Empty params!"); 
	  } else if (typeof pp == 'object') { 
	    params = pp; 
	  } else if (typeof pp == 'string') { 
	    params = [pp]; 
	  } else {
	    return err("Invalid params!"); 
	  }
	  if (opts) {
	    onSuccess = (typeof opts.onSuccess == 'function') ? opts.onSuccess : undefined;
	    onError   = (typeof opts.onError == 'function') ? opts.onError : undefined;
	    onComplete= (typeof opts.onComplete  == 'function') ? opts.onComplete : undefined;
	    //alert(typeof opts.onSuccess+"\n"+onSuccess);
	  } else {
	    //opts = {};
	    onSuccess  = undefined;
	    onError    = undefined;
	    onComplete = undefined;
	  }
	  if (callbacks[app]) {
	    if (! onSuccess)  onSuccess = callbacks[app].onSuccess ? callbacks[app].onSuccess : undefined ;
	    if (! onError)    onError = callbacks[app].onError ? callbacks[app].onError : undefined ;
	    if (! onComplete) onComplete = callbacks[app].onComplete ? callbacks[app].onComplete : undefined ;
	  }

	  sessID = String(new Date().getTime()) + String(Math.floor(Math.random()*1000));
	  var son = {
	      jsonrpc: ver,
	      id: sessID,
	      method: application,
	      params: params
	  };
	  // history block
	  var hid = "REQ-"+sessID;
	  if (History[hid] == undefined) {
	      History[hid] = {
	        id:         sessID,
		sent:       false,
		complete:   false,
		ready:      false,
		error:      false,
		errorMSG:   "",
		params:     params,
		response:   undefined,
		localData:  opts ? opts.localData : undefined,
		XR:         undefined,
		callbacks:  {
		  onSuccess: onSuccess,
		  onError:   onError,
		  onComplete:onComplete
		}
	      }
	  } else {
	      return err("Creating duplicate session \n["+hid+"]\n["+History[hid]+"]");
	  }
	  // end history block
	  var ajj = $.ajax({
	    async:    true,
	    global: false,
	    type:     'POST',
	    dataType: 'json',
	    cache:    cache,
	    username: HTTPuser,
	    password: HTTPpasswd,
	    url:  URL,
	    data: JSON.stringify(son),
	    success: function (data, status, XR) {
	      var hid = null;
	      if (data.id != null) {
		hid = 'REQ-'+data.id;
	      }
	      var emsg = '';
	      if (data.error != null) {
		emsg = "RPC error!!!";
	      } else {
	        // all OK
	        if (History[hid] != undefined) {
	            History[hid].response = data.result;
		} else {
		    History[hid].error = true;
		    History[hid].errorMSG = "Session sync error."; 
		}
		if (typeof History[hid].callbacks.onSuccess == 'function') {
		  History[hid].callbacks.onSuccess(data, status, XR);
		}
	      }
	      if (emsg != '') {
	        if (hid) {
		  History[hid].error = true;
		  History[hid].errorMSG = emsg; 
		}
		if (hid && (typeof History[hid].callbacks.onError == 'function')) {
	          History[hid].callbacks.onError(XR, emsg, status);
		} else {
	          return err(emsg);
		}  
              }
	    },
	    error: function(XR, textStatus, errorThrown) {
	      err(textStatus+"\n"+errorThrown+"\n"+XR);
	    },
	    beforeSend: function() {
	      History['REQ-'+sessID].sent = true;
	    },
	    complete: function(XR, textStatus) {
	      var hid=null;
	      var resp = XR.responseText;
	      try {
	        hid = eval('('+resp+')');
	      } catch (e) {
	      } finally {
	      	if (hid) {
	          hid = 'REQ-'+hid.id;
		}
	      }
	      if (hid && (History[hid] != undefined)) {
	        if (XR.readyState == 4) {
		  History[hid].ready = true;
		}
	      }
	      if (hid && (typeof History[hid].callbacks.onComplete == 'function')) {
	        History[hid].callbacks.onComplete(XR, textStatus);
	      }
	    }
	  });
	  History[hid].XR = ajj;
	  return {
	    id:   sessID,
	    ajax: ajj
	  }
	};
  }
  return new construct();
}
//--------------------------------------------------------------
//--------------------------------------------------------------
