import axios from "axios"
import data from "../data"

let cacheVerify = []

const verifyToken = token =>
{
    return new Promise((resolve, reject) =>
    {
        const searchCache = cacheVerify.filter(item => item.token === token)
        if (searchCache.length > 0) resolve(searchCache[0].id)
        else
        {
            axios.get(data.REST_URL + "/u/verify-token/", {headers: {"Authorization": token}})
                .then(response =>
                {
                    if (response.data.identity.id)
                    {
                        resolve(response.data.identity.id)
                        cacheVerify.push({token, id: response.data.identity.id})
                        if (cacheVerify.length > 10) cacheVerify.splice(0, 1)
                    }
                    else throw "err"
                })
                .catch(err => reject(err))
        }
    })
}

const authController = {
    verifyToken,
}

export default authController