const express = require("express");
const router = express.Router();
const con = require("./db");
const middleware = require("./middleware/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.get("/", (req, res) => {
  res.send("OK");
});

router.get("/hidden", middleware.isLoggedIn, (req, res) => {
  console.log(req.userData);
  res.send("This is hidden information");
});

router.get("/books", middleware.isLoggedIn, (req, res) => {
  if (req.userData) {
    con.query(
      `SELECT * FROM books WHERE user_id = ${req.userData}`,
      (err, result) => {
        if (err) {
          res.status(400).json({ msg: "Problem with DB" });
        } else {
          res.json(result);
        }
      }
    );
  }
});

function bookValid(data) {
  return data && data.trim(" ") !== "" ? data.toLowerCase() : false;
}

router.post("/addbook", middleware.isLoggedIn, (req, res) => {
  let book = {
    author: bookValid(req.body.author),
    title: bookValid(req.body.title),
  };
  console.log(book);
  if (req.userData && book.author && book.title) {
    con.query(
      `INSERT INTO books (user_id, author, title) VALUES('${req.userData.userId}', '${book.author}', '${book.title}')`,
      (err, result) => {
        if (err) {
          res.status(400).json({ msg: "Problem with DB." });
        } else {
          res.json({
            msg: `Book added to database.`,
            result: result,
          });
        }
      }
    );
  } else {
    res
      .status(400)
      .json({ msg: "There was an error with your login or post information." });
  }
});

router.post("/login", (req, res) => {
  const username = req.body.username.toLowerCase();
  con.query(
    `SELECT * FROM users WHERE username = '${username}'`,
    (err, result) => {
      if (err || result.length === 0) {
        err
          ? res.status(400).json({ msg: "Problem with DB." })
          : res.status(400).json({ msg: "No such user." });
      } else {
        bcrypt.compare(
          req.body.password,
          result[0].password,
          (bErr, bResult) => {
            if (bErr || !bResult) {
              res
                .status(400)
                .json({ msg: "The username password is not correct" });
            } else {
              if (bResult) {
                const token = jwt.sign(
                  { userId: result[0].id, username: result[0].username },
                  process.env.SECRET_KEY,
                  { expiresIn: "7d" }
                );
                res.status(200).json({ msg: "Logged In", token });
              }
            }
          }
        );
      }
    }
  );
});

router.post("/register", middleware.validateRegistration, (req, res) => {
  const username = req.body.username.toLowerCase();
  con.query(
    `SELECT * FROM users WHERE username = '${username}'`,
    (err, result) => {
      if (err) {
        res.status(400).json({ msg: "The DB is broken." });
      } else if (result.length !== 0) {
        res.status(400).json({ msg: "The user already exists" });
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            res.status(400).json(err);
          } else {
            con.query(
              `INSERT INTO users (username, password) VALUES ('${username}', '${hash}')`,
              (err, result) => {
                if (err) {
                  res.status(400).json(err);
                } else {
                  res
                    .status(201)
                    .json({ msg: "USER has registered succesfully." });
                }
              }
            );
          }
        });
      }
    }
  );
});

module.exports = router;
