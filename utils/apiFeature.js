class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  // without afdmin creation
  filterLearnerTeacher() {
    const queryObject = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObject[el]);
    //1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObject);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // modified filter to handle admin createion
  // filter() {
  //   let queryObject = { ...this.queryString };
  //   const excludedFields = ["page", "sort", "limit", "fields"];
  //   excludedFields.forEach((el) => delete queryObject[el]);

  //   // Create separate conditions for admin and other schools
  //   const adminCondition = { school: "6603e6e06e7e286c38da1ea1" };
  //   const otherCondition = { ...queryObject };

  //   // Combine conditions using $or operator
  //   const combinedCondition = { $or: [adminCondition, otherCondition] };

  //   // Advanced Filtering
  //   let queryStr = JSON.stringify(combinedCondition);
  //   queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  //   this.query = this.query.find(JSON.parse(queryStr));
  //   return this;
  // }
  // filter() {
  //   let queryObject = { ...this.queryString };
  //   const excludedFields = ["page", "sort", "limit", "fields"];
  //   excludedFields.forEach((el) => delete queryObject[el]);

  //   // Create separate conditions for admin and other schools
  //   const otherCondition = { ...queryObject };

  //   // Include additional conditions for admin
  //   const adminCondition = {
  //     ...queryObject,
  //     school: "6603e6e06e7e286c38da1ea1",
  //   };
  //   // Advanced Filtering
  //   let queryStr = JSON.stringify({ $or: [adminCondition, otherCondition] });
  //   queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  //   this.query = this.query.find(JSON.parse(queryStr));
  //   return this;
  // }

  filter() {
    let queryObject = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObject[el]);

    // Handle 'term' as an array using the $in operator to match any term in the array
    if (queryObject.term) {
      // Check if term is a string, then split and convert each value to a number
      if (typeof queryObject.term === "string") {
        queryObject.term = queryObject.term.split(",").map(Number); // Convert to numbers
      }
      // Handle the case where term is already an array, ensure it's numeric
      if (Array.isArray(queryObject.term)) {
        queryObject.term = queryObject.term.map(Number); // Make sure it's an array of numbers
      }
      queryObject.term = { $in: queryObject.term }; // MongoDB query for matching terms
      console.log(queryObject.term, "queryObject.term"); // Match any term in the array
    }

    // Handle 'name' as an array using the $in operator to match any name in the array
    if (queryObject.name) {
      // Split the name string into an array if it's not already an array
      if (typeof queryObject.name === "string") {
        queryObject.name = queryObject.name.split(","); // Don't convert, treat as strings
      }
      queryObject.name = { $in: queryObject.name }; // MongoDB query for matching names
      console.log(queryObject.name, "queryObject.name"); // Match any name in the array
    }

    // Create separate conditions for admin and other schools
    const otherCondition = { ...queryObject };

    // Include additional conditions for admin
    const adminCondition = {
      ...queryObject,
      school: "6603e6e06e7e286c38da1ea1", // Example admin school ID
    };

    // Advanced Filtering
    let queryStr = JSON.stringify({ $or: [adminCondition, otherCondition] });
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");

      this.query = this.query.sort(sortBy);
      // sort('price ratingsAverage'), if there's a tie
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitfields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 20;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
