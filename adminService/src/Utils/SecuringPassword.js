import bcrypt from 'bcrypt'

export const hashPassword = (password) => {
    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(password, salt)
    return hash
}

export const comparePassword = (password, receivedPassword) => {
    return bcrypt.compareSync(password, receivedPassword)
}
