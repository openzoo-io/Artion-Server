class Utils {
  static groupObjectArrayByProperty(xs, key) {
    return xs.reduce(function (rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }
  static isNumeric(value) {
    return /^-?\d+$/.test(value);
  }

  static minValueOfArray(array) {
    return Math.min.apply(null, array);
  }

  static maxValueOfArray(array) {
    return Math.max.apply(null, array);
  }

  static sortArrayAlphabetically(array) {
    return array.sort(function (a, b) {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
  }
}

module.exports = Utils;
