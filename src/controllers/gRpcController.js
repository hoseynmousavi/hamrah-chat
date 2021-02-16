import {credentials, loadPackageDefinition} from "@grpc/grpc-js"
import {loadSync} from "@grpc/proto-loader"
import path from "path"

let cacheNames = {}
let client = null

const startGRPC = () =>
{
    const packageDefinition = loadSync(path.join(__dirname, "../data/identity.proto"))
    const packageObject = loadPackageDefinition(packageDefinition)
    client = new packageObject.identity.IdentityController("37.152.178.184:50051", credentials.createInsecure())
}

const getFullName = username =>
{
    return new Promise((resolve, reject) =>
    {
        if (!username) resolve(null)
        else if (cacheNames[username]) resolve(cacheNames[username])
        else if (client && client.GetFullname)
        {
            client.GetFullname(
                {username},
                (error, name) =>
                {
                    if (error) reject(error)
                    else
                    {
                        resolve(name.nickname)
                        cacheNames[username] = name.nickname
                    }
                },
            )
        }
        else reject("not connected!")
    })
}

const resetCacheNames = () =>
{
    cacheNames = {}
}

const gRpcController = {
    startGRPC,
    getFullName,
    resetCacheNames,
}

export default gRpcController