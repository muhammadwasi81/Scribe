// Create UserResource class For Response
export class UserResource {
  constructor(user) {
    // Create UserObject
    this.UserObject = {
      id: user._id,
      userName: user.userName,
      fullName: user.fullName,
      image: user.image
        ? user.image._doc.mediaUrl.replaceAll("\\", "/")
        : "public/uploads/default.png",
      gender: user.gender,
      address: user.address,
      description: user.description,
      bio: user.bio,
      followingCount: user.followingCount ? user.followingCount : 0,
      followersCount: user.followersCount ? user.followersCount : 0,
    };
  }
  static user(user) {
    return {
      user: {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        image: user.image ? user.image._doc.mediaUrl : "uploads/default.png",
        gender: user.gender,
        address: user.address,
        description: user.description,
        bio: user.bio,
        followingCount: user.followingCount ? user.followingCount : 0,
        followersCount: user.followersCount ? user.followersCount : 0,
      },
    };
  }

  // static UserAndOtp(user, otp) {
  //     // Create UserObject
  //     const UserObject = {
  //         id: user._id,
  //         phone: user.phone,
  //         email: user.email,
  //         is_verified: otp.is_verified,
  //         verfiy_at: otp.verfiy_at,
  //         createdAt: moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  //     }
  //     return {
  //         user: UserObject,
  //     }
  // }
  // static UserAndChild(user, child) {
  //     // Create UserObject
  //     const UserObject = {
  //         id: user._id,
  //         phone: user.phone,
  //         email: user.email,
  //         createdAt: moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  //     }
  //     return {
  //         user: UserObject,
  //         child: child,
  //     }
  // }
  // static UserAndToken(user, token) {
  //     // Create UserObject
  //     const UserObject = {
  //         id: user._id,
  //         fullName: user.fullName,
  //         profilePicture: user.profilePicture,
  //         phone: user.phone,
  //         email: user.email,
  //         address: user.address,
  //         city: user.city,
  //         state: user.state,
  //         grade: user.grade,
  //         birthdate: user.birthdate,
  //         tier: user.tier,
  //         parent_id: user.parent,
  //         createdAt: moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  //     }
  //     return {
  //         user: UserObject,
  //         token: token,
  //     }
  // }
  // static User(user) {
  //     // Create UserObject
  //     const UserObject = {
  //         id: user._id,
  //         fullName: user.fullName,
  //         profilePicture: user.profilePicture,
  //         phone: user.phone,
  //         email: user.email,
  //         address: user.address,
  //         city: user.city,
  //         state: user.state,
  //         createdAt: moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  //     }
  //     return {
  //         user: UserObject,
  //     }
  // }
}
