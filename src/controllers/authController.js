import tokenHelper from "../functions/tokenHelper"

const verifyToken = ({token, checkStaff}) =>
{
    return new Promise((resolve, reject) =>
    {
        tokenHelper.decodeToken(token.slice(4, token.length))
            .then(user =>
            {
                if (checkStaff)
                {
                    if (user.is_staff) resolve(user)
                    else reject("you don't have permission!")
                }
                else resolve(user)
            })
            .catch(err => reject(err))
    })
}

const authController = {
    verifyToken,
}

export default authController