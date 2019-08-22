const express = require('express');

const Hubs = require('./hubs-model.js');
const Messages = require('../messages/messages-model.js');

const router = express.Router();

//
// this is a basic middleware method that just calls next()
//
router.use((req, res, next) => {
  console.log('hubs router baby!');
  next();
})

// this only runs if the url has /api/hubs in it
router.get('/', async (req, res) => {
  try {
    const hubs = await Hubs.find(req.query);
    res.status(200).json(hubs);
  } catch (error) {
    // log error to server
    console.log(error);
    res.status(500).json({
      message: 'Error retrieving the hubs',
    });
  }
});

//
// because this router is bound (in server.js) to
// the /api/hubs root url, the effective METHOD/url
// that will trigger this middleware is /api/hubs/:id.
//
// note that this method not only supplies the
// typical arrow function as middleware for the METHOD/url,
// but it also specifies *another* middleware method (this time
// by just supplying its name, validateId), as a parameter to
// .get().
//
// validateId() looks up the hub with the id, and if it
// finds it, it adds the hub object to the req object.
//
// That way, we don't have to do another lookup here...
// we can just use the hub object on req.
//
router.get('/:id', validateId, async (req, res) => {

  res.status(200).json(req.hub);

});

//
// like the GET middleware handler above, this .post()
// call specifies additional middleware (in addition to 
// the arrow function): requireBody.
//
// the requireBody() middleware just confirms that a body
// was supplied, and indicates an error condition by calling
// next(error) if not.
//
// that way, we don't have to do the check here, and we can
// leverage the check elsewhere (like PUT request handlers).
//
router.post('/', requireBody, async (req, res) => {
  try {
    const hub = await Hubs.add(req.body);
    res.status(201).json(hub);
  } catch (error) {
    // log error to server
    console.log(error);
    res.status(500).json({
      message: 'Error adding the hub',
    });
  }
});

//
// DELETE requests need an id, so we need to add 
// validateId to the chain for delete requests.
router.delete('/:id', validateId, async (req, res) => {
  try {
    const count = await Hubs.remove(req.params.id);
    if (count > 0) {
      res.status(200).json({ message: 'The hub has been nuked' });
    } else {
      res.status(404).json({ message: 'The hub could not be found' });
    }
  } catch (error) {
    // log error to server
    console.log(error);
    res.status(500).json({
      message: 'Error removing the hub',
    });
  }
});

//
// the PUT request needs a valid ID *and* a body, so we can
// add both validateId *and* requireBody to the middleware chain.
//
router.put('/:id', validateId, requireBody, async (req, res) => {
  try {
    const hub = await Hubs.update(req.params.id, req.body);
    if (hub) {
      res.status(200).json(hub);
    } else {
      res.status(404).json({ message: 'The hub could not be found' });
    }
  } catch (error) {
    // log error to server
    console.log(error);
    res.status(500).json({
      message: 'Error updating the hub',
    });
  }
});

// add an endpoint that returns all the messages for a hub
// this is a sub-route or sub-resource
router.get('/:id/messages', validateId, async (req, res) => {
  try {
    const messages = await Hubs.findHubMessages(req.params.id);

    res.status(200).json(messages);
  } catch (error) {
    // log error to server
    console.log(error);
    res.status(500).json({
      message: 'Error getting the messages for the hub',
    });
  }
});

//
// here is an example of a POST handler that needs both a valid
// id *and* a message body.
//
// add an endpoint for adding new message to a hub
//
// note the use of the "rest" operator/syntax "..." (again, not to be
// confused with REST API's - totally unrelated. Google-fu it.)
//
router.post('/:id/messages', validateId, requireBody, async (req, res) => {
  const messageInfo = { ...req.body, hub_id: req.params.id };

  try {
    const message = await Messages.add(messageInfo);
    res.status(210).json(message);
  } catch (error) {
    // log error to server
    console.log(error);
    res.status(500).json({
      message: 'Error getting the messages for the hub',
    });
  }
});

//
// this is our validate() middleware.
// note that this middleware is not required for *all* 
// HTTP requests - only those that have an :id parameter.
//
// You can add middleware to the chain by calling a .METHOD 
// method on server() or Router(), or you can add it to the 
// chain by adding it to the list of methods to be run when
// a specific METHOD with a specific url is called (as seen above)
//
async function validateId(req, res, next) {
  try {
    const {id} = req.params;

    const hub = await Hubs.findById(id);
  
    if (hub) {
      req.hub = hub;
      next();
    } else {
      next({message: 'the id you sent was invalid'});
    }
  } catch (error) {
    next({message:'some major jam...'});
  }
  
}

//
// this middleware is just like validateId. See above.
//
function requireBody(req, res, next) {
  if (req.body && Object.keys(req.body).length > 0) {
    next();
  } else {
    next({message: 'You need to supply a body with this request'});
  }
}




module.exports = router;
