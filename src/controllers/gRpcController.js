import {credentials, loadPackageDefinition} from "@grpc/grpc-js"
import {loadSync} from "@grpc/proto-loader"
import path from "path"

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
        if (client && client.GetFullname)
        {
            client.GetFullname(
                {username},
                (error, name) =>
                {
                    if (error) reject(error)
                    else resolve(name.nickname)
                },
            )
        }
        else reject("not connected!")
    })
}

const gRpcController = {
    startGRPC,
    getFullName,
}

export default gRpcController