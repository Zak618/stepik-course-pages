// Captured from the task-owned MySQL 26.10.0 preview. No Stepik connection.
export const traces={
  "syntax": {
    "sql": "SELECT *\nproducts;",
    "executed": false,
    "errno": 1064,
    "sqlState": "42000",
    "message": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'products' at line 2"
  },
  "double": {
    "sql": "SELECT *\nproduct;",
    "executed": false,
    "errno": 1064,
    "sqlState": "42000",
    "message": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'product' at line 2"
  },
  "table": {
    "sql": "SELECT *\nFROM product;",
    "executed": false,
    "errno": 1146,
    "sqlState": "42S02",
    "message": "Table 'sql_select_case_0.product' doesn't exist"
  },
  "ready": {
    "sql": "SELECT *\nFROM products;",
    "executed": true,
    "columns": [
      "id",
      "name",
      "price",
      "stock"
    ],
    "rows": [
      [
        101,
        "Монитор",
        "18990.00",
        7
      ],
      [
        102,
        "Клавиатура",
        "6490.00",
        12
      ],
      [
        103,
        "Кабель USB-C",
        "890.00",
        30
      ],
      [
        104,
        "Подставка",
        "2490.00",
        8
      ]
    ]
  }
};
