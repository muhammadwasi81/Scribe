export class AuthorResource {
  constructor(userDbObject) {
    this.id = userDbObject._id;
    this.userName = userDbObject.userName;
    this.fullName = userDbObject.fullName;
    this.bio = userDbObject.bio;
    this.image = userDbObject.image
      ? userDbObject.image._doc
        ? userDbObject.image._doc.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
        : userDbObject.image.mediaUrl
        ? userDbObject.image.mediaUrl.replaceAll("\\", "/").replaceAll("./", "")
        : "public/uploads/default.png"
      : "public/uploads/default.png";
    this.isFollowing = !!userDbObject.isFollowing;
  }
}
