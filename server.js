
//
// In this file, we requires() a couple of packages that
// help us ensure that our responses are secure, and also
// help us produce useful logging of the use of our API
// server.
//
// helmet() will ensure that our responses have certain
// security headers, and morgan() can be used to log
// in various formats and granularities (not like singularities...)
//

const express = require('express'); // importing a CommonJS module
// hey look! one of our router modules from last time!
// hey there, router module!
const hubsRouter = require('./hubs/hubs-router.js');

//
// these are examples of "third party middleware" ...
// middleware created by not us (the first party), 
// and not express() (the second party), 
// but by a *third* party...
// 
// if you are really curious, take a peak at how morgan
// (for example) is written by opening ./modules/morgan/index.js
// (from the root of the project).
// 
// these are just express() middleware, just like the
// ones-es that we writes. (I sound like Gollum.)
//
// helmet() ensures that we have certain headers in our
// responses that help us be secure.
//
// morgan(), if added to the middleware chain for any
// HTTP request, will log information about those 
// requests to the console, or a file, etc.
//
// Here, we just require() them so we can add them
// to our middleware chain using server.use() (or router.use()
// if we want to limit the scope of their application)
//
const helmet = require('helmet');
const morgan = require('morgan');

const server = express();

// methodLogger() is a middleware method at the bottom of the
// file that is our own lame attempt to do what morgan() does...
server.use(methodLogger);

// express.json() is bit of middleware is a parser that ensures that the
// text in the request body, if it happens to be in json
// format (like a stringified object), is converted into a
// REAL json object (like Pinnochio), which we can access
// through req.body...
server.use(express.json());

// this binds our hubs router to a url root...
server.use('/api/hubs', hubsRouter);

// hey look! there's that third party middleware, helmet.
server.use(helmet());

// addName() is a demonstration of how we can add data
// to the req object (we could also add to res... look it up!)
// checkout the method below for more notes on this...
server.use(addName);

// lockout() is another middleware demonstratino...
// the method for adding lockout() to the middleware chain
// (server.use()) is commented out, because lockout()
// prevents any other middleware from processing... so
// don't uncomment this unless you want to hork your entire
// api. (Heh heh. I said hork.)
//server.use(lockout);

// hey, there's the other third party middleware!
// now we are cookin...
server.use(morgan('dev'));

// gateKeeper() is another bit of middlewear that we 
// wrote that is as toxic as lockout(), only it 
// horks the api only if the current second is a
// multiple of 3... we are so weird...
server.use(gateKeeper);

//
// in the express() middlewhere chain, each middleware
// method must either "respond" to the request by calling 
// res.send() or res.json(), or pass in the chain. (If it doesn't
// do one of those things, express() just hangs, and the client
// gets bored waiting for a request, and eventually gives up.)
//
// As calls to server.use() and server.METHOD() are executed,
// the callback functions that are passed to them are added
// to the chain in-order (I also call this "registering the
// middleware function to handle the METHOD/url combination").
//
// note that not specifying a METHOD (by calling .use() instead
// of .METHOD() like .get() .post() etc.) means "this middleware
// applies to requests of all METHOD types". Not specifying a
// url means "this middleware applies to requests on any url".
// Not specifying either (by calling .use() without a url) means
// "this middleware method applies to *all* requests. Period."
// (That's three periods in a row, in case you are counting.)
//
// one certain type of middleware method is specially designed
// to ONLY handle _error conditions_ that occur as part of the
// chain processing. It is never called as the first middleware
// method to handle a request, and when middleware methods in
// the chain call next(), these error handling methods are 
// skipped (unless there is an error... this is covered below.)
//
// "Errors" that cause express() to execute a special "error
// handling middleware method" really aren't errors in the
// normal JavaScript sense... in JavaScript, a rejected promise,
// or a thrown exception constitute a *real* error. But in express(),
// an error-handling-middleware-method isn't called by express()
// unless our code tells it to. (I explain how we tell it to
// below. Stay with me, settle down now...)

// If this happens, express() skips through
// all of the *normal* methods in the chain, looking for one that is
// *specially designed to handle errors* for the METHOD/url of the
// current request. It will execute the first middleware method in 
// the chain that is an error-handling-middleware-method, and that 
// matches the METHOD/url of the req.
//
// error-handling-middleware-methods are recognizeable
// (to us and to express()) by the fact that they take *4* 
// parameters, instead of 2 or three. 
//
// The first parameter is the error object. It doesn't have to 
// be called "error" ... that's just a convention... and it 
// doesn't have to be an actual instance of the Error class, 
// though that is also a convention... there just has to be 
// 4 parameters, and know that the first one is the object 
// that the raiser/thrower of the error is passing along...
// (Who knows what's in it... it's an arbitrary object...)
//
// by registering an error-handling-middleware-method using 
// server.use() without a METHOD or url, and specifying 4 parameters
// for the callback method, we create a global error handler that
// will be available for every request.
//
// error-handling-middleware-methods are just like any other middleware...
// they can be bound to a specific URL, like this:
//
//      server.use('/api/hubs/noworky', (error, req, res, next) => {
//        /* ...middlewaremagichappenshere... */
//      })
//
// the preceding middleware would be error handling middleware that
// *only* will be executed *iff* an error condition occurs (which really
// just means that our code tells express() that it should find and
// and execute the next error handler) while processing a request 
// for /api/hubs/noworky[/*].
//
// the example below isn't bound to a url, so it applies to everything.
// (it must be communist.)
//
// see validateId() and requireBody() in hubs-router.js for an example 
// of middleware methods that don't  handle their own error conditions
// (they so lazy)... They don't call res.status(400).json(something) 
// when something goes wrong... And they also don't call next(),
// asking express() to find the next normal middleware method
// and execute it.
//
// instead, they call next() *with a parameter*. 
//
// Normally, middleware functions just call next() witout a 
// parameter, which basically tells express() : 
//
//    "go get the next NORMAL middleware method that 
//    is registered for the URL for this req,
//    and run it. Give it the req and res objects, too."
//
// But if you call next(with_a_parameter), that basically tells
// express() : 
//
//    "OHMYGOSHI'MONFIRE!!! So, _skip_ all the normal middleware,
//    and find a special ERROR HANDLING MIDDLEWARE METHOD that 
//    is registered to handle errors for the METHOD/url for this 
//    request, and give them this parameter! They will know what to do..."
//
// the error handling middleware below returns a 400 with a message
// by calling res.json() ... after all, all middleware methods HAVE TO
// either call res.json() or res.send()... OR, call next() (with or without
// a parameter).
//
// Even though the middleware below is an error handling middleware,
// it doesn't have to return an error status code. 
//
// It's possible that the method can *fix the problem* (whatever it is)
//
// In fact, because the error handling middleware has the next() method, 
// it *could* resume normal processing of the request... maybe the error 
// just needed to be logged, or maybe the method can correct the error. 
//
// If we call next() (without a parameter) from within an error handler, 
// express() will find the next unexecuted NORMAL middleware method
// in the chain (that isn't an error handler) and run it.
//
// likewise, we *could* either pass the error object that we received 
// to next(), or we could create an entirely *new* error object, 
// and pass it to next(). This would cause express() to find the 
// next error handler in the chain, and pass the error object to it. 
// (Again, it recognizes "the next error handler in the chain" by
// looking at the number of parameters the method is expecting... those that 
// expect 4 are error handlers.)
//
// If there *isn't* another error handler, but we pass an object to 
// next() (telling express() that we need it to find one), 
// express() will handle the error itself with it's own built-in error
// handler. This handler responds with a 500 Internal Srever Error response,
// and puts the error object in an HTML body. It basically does this:
//
//      (error, req, res, next) => {
//          res.status(500).render(view...)  
//      }
//
// note that res.render() is *another* way we can respond to the client,
// using a feature of express() that we haven't covered called "teplates"
// and views... it uses this to create an HTML response with the error
// object. The point is, it ends processing, and responds with a 500.
//
// Man. I should write a book. Oh, wait... I already did. (sorry)
//
server.use((error, req, res, next) => {
  // do something to handle the error
  //res.status(400).json({message: 'error!', error});
  next(error);
});


//
// this is an example of accessing custom data added to
// the req object (or the res object) by middleware
// that was executed before this one. In this case,
// we are accessing req.name (.name isn't a normal property
// of the req object... it was added by the addName() method,
// which was registered in a call to server.use() above
// as a global middleware method - i.e. EVERY request, 
// regardless of the METHOD or the url.)
//
server.get('/', (req, res) => {
  const nameInsert = (req.name) ? ` ${req.name}` : '';

  console.log(req.header('X-mycustomname'));

  res.send(`
    <h2>Lambda Hubs API</h2>
    <p>Welcome${nameInsert} to the Lambda Hubs API</p>
    `);
});

//
// this is our lame attempt at creating a middleware
// method that tries to do what morgan() does.
// But, it does demonstrate the role of the 
// "next" parameter... by calling it, it just
// lets express() move on to the next middleware method.
//
function methodLogger(req, res, next) {
  const nameInsert = (req.name) ? ` ${req.name}` : '';

  console.log(`${req.method} request received from ${nameInsert}`);
  next();
}

//
// this middleware method adds a custom bit of data to 
// the req object. In this way, middleware methods can
// pass data to the next (and next, down the line) middleware
// method(s). The data included *could* alter how future middleware
// methods behave.
//
function addName(req, res, next) {
  console.log('adding name...');
  req.name = 'sk';
  
  next();
}

//
// this middleware method basically kills your api.
//
function lockout(req, res, next) {
  res.status(403).json({message: 'API locked out!'});
}

//
// this middleware method basically tries to kill
// your api with 1000 cuts (assuming you make 3000
// api calls, and they are evenly distributed among all 
// 60 seconds of a minute)
//
function gateKeeper(req, res, next) {
  const seconds = new Date().getSeconds();

  console.log(`the seconds is: ${seconds}`);

  if (seconds % 3 === 0) {
    res.status(403).json({message: 'I hate 3...'});
  } else {
    next();
  }

}

module.exports = server;
