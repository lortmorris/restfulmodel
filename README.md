# RESTfull Model App

This is a easy RESTFul model app, designed for Node.js + Express Application.
Powered by: [César Casas] (https://ar.linkedin.com/in/cesarcasas)

# Swagger
Swagger is free standard API definition. Now, you can build applications from API definition!.     
[swagger.io](http://swagger.io/)


# Install & Run
## Install
```bash
$ git clone https://github.com/lortmorris/restfulmodel.git
$ cd restfulmodel
$ npm install
$ mongoimport -d restful -c countries --file ./data/countries.json
$ node bin/www
```

## Browser Swagger doc
http://localhost:5000/service/docs/#/


# Example.

## Mobile App
- Professionals:
```javascript
{
  _id,
  fname: '',
  lname: '',
  category: {
    name: '',
    _id: ''
  },
  address: {
    street: '',
    streetNumber: '',
    block: '',
    department: '',
    floor: '',
    location: {
      type: 'point',
      coordinates: [0, 0],
    },  
  },
  score: 0,
  enabled: true,
}
```

- Categories:
```javascript
  {
    _id: '',
    name: '',
  }
```
- Messages:
```javascript
  {
    _id: '',
    user: {
      fname: '',
      lname: '',
      _id: '',
    },
    message: '',
    replyTo: null,
    professional: {
      _id: '',
      fname: '',
      lname: '',
    },
  }
```
