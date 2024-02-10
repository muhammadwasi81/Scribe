// Add User  by Default

// Create User  Seeder
export const UserSeeder = async () => {
    try {
        const User = await User.find()
        // Create User  Array
        const UserArray = []
        // Create User
        if (User.length === 0) {
            await User.insertMany(UserArray)
        }
    } catch (error) {
        console.log(error)
    }
}
