import { PostResource } from "./postResource.js";
import { UserResource } from "./UserResource.js";

export class ProfileResource {
  constructor(userDbObject) {
    this.user = new UserResource(userDbObject).UserObject;
    this.posts = userDbObject.posts
      ? userDbObject.posts.map((post) => {
          return new PostResource(post);
        })
      : [];
  }
}
