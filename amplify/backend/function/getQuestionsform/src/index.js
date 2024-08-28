/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["DB_USERNAME","DB_PASS"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/


const aws = require("aws-sdk");

exports.handler =async (event) => {
    const id = event.pathParameters.id;
    //console.log("Hellooooooooooooooooooooo"+id)
//   const { Parameters } = await new aws.SSM()
//     .getParameters({
//       Names: ["DB_USERNAME", "DB_PASS"].map(        
//         (secretName) => process.env[secretName]
//       ),
//       WithDecryption: true,
//     })
//     .promise();

  //console.log(Parameters);

  const promise = new Promise((resolve, reject) => {
    let sql = require("mssql");

    const config = {
        user: "admin",
        password: "Admin123",
        server: "irog-ai-db.cv62ee6awzrf.us-east-2.rds.amazonaws.com",
        port: 1433,
        options: {
          database: "irog",
          encrypt: false,
        },
      };

    sql.connect(config, (err) => {
      if (err) {
        reject(err);
      } else {
        const request = new sql.Request();
        request.input("caseId", sql.NVarChar, id);  
      
        const selectQuery =`select q.Id, q.SequenceNumber,q.MsgSentDateTime,  q.CaseId, q.MsgSent, q.MsgReceived, q.OriginalQuestion 
        ,q.StandardQuestion,0 as IsModified,r.PiiInfo as PiiInfo,  r.StandardAnswer, r.OriginalAnswer from questions q 
                left outer join Webresponses r on q.Id = r.QuestionId and r.IsActive=1
                where q.CaseId=@caseId and q.IsActive=1 order by q.SequenceNumber asc`;
        request.query(selectQuery, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  });

  try {
    const result = await promise;
    console.log("Step-1");
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        'Content-Type':'text/plain'
      },
      body: JSON.stringify(result),
    };
    return response;
  } catch(e) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        'Content-Type':'text/plain'
      },
      body: JSON.stringify(e.message),
    };
  }
};
