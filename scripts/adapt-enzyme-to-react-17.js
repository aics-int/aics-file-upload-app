/* This is intended to be `required` by mocha in order to test React components */
const Adapter = require("@wojtekmaj/enzyme-adapter-react-17");
const enzyme = require("enzyme");

enzyme.configure({ adapter: new Adapter() });
