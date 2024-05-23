import "@aws-amplify/ui-react/styles.css";

import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import React, { useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import Submit from "./Submit"



function App() {
 
  return (
    <div>    
      <Routes>    
      <Route path="/" element={<LandingPage />} />    
        <Route exact path="/Submit/:key" element={<Submit />}/>
        
      </Routes>
    </div>
  );
}


export default App;

