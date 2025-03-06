import User from "../models/user.js";

const mytest = async (req, res, next) => {
    try {
      const newAdmins = await User.create(
        [
            {
              "_id": "6489c58a5e4fbd0011fbb101",
              "email": "john@example.com",
              "password": "hashedpassword123",
              "role": "customer",
              "linkedId": "6489c58a5e4fbd0011fbb101",
              "isActive": true,
              "lastLogin": "2024-11-01"
            },
            {
              "_id": "6489c58a5e4fbd0011fbb102",
              "email": "jane@example.com",
              "password": "hashedpassword456",
              "role": "driver",
              "linkedId": "6489c58a5e4fbd0011fbb302",
              "isActive": true,
              "lastLogin": "2024-11-05"
            },
            {
              "_id": "6489c58a5e4fbd0011fbb103",
              "email": "bob@example.com",
              "password": "hashedpassword789",
              "role": "partner",
              "linkedId": "6489c58a5e4fbd0011fbb403",
              "isActive": true,
              "lastLogin": "2024-11-07"
            }
          ]
      );
  
      console.log("Success");
      console.log(newAdmins); // Log the created Admin documents
      res.status(201).json({ success: true, data: newAdmins });
    } catch (error) {
      console.error("Error occurred:", error.message); // Correct error logging
      res.status(500).json({ success: false, error: error.message });
    }
  };
export {mytest}