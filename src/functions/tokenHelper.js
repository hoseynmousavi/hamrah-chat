import fs from "fs"
import path from "path"
import jwt from "jsonwebtoken"

const cert = fs.readFileSync(path.join(__dirname, "../data/public.key"))

const decodeToken = (token) =>
{
    return new Promise((resolve, reject) =>
    {
        jwt.verify(token, cert, {algorithms: ["RS256"]}, (err, payload) =>
        {
            if (err) reject({status: 403, err})
            else resolve(payload)
        })
    })
}

const tokenHelper = {
    decodeToken,
}

export default tokenHelper
