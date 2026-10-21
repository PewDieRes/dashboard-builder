INSERT INTO dashboards (id, name) VALUES (1, 'Sales Overview');

INSERT INTO sections (id, dashboard_id, title, grid_column, grid_row, column_span, row_span, sort_order) VALUES
    (1, 1, 'Highlights', 1, 1, 4, 28, 0),
    (2, 1, 'Monthly Revenue', 5, 1, 8, 28, 1),
    (3, 1, 'Site Traffic', 1, 29, 7, 28, 2),
    (4, 1, 'Brand', 8, 29, 5, 28, 3);

INSERT INTO elements (section_id, element_type, offset_x_percent, offset_y_percent, width_percent, height_percent, z_index, content) VALUES
    (1, 'text', 5, 5, 90, 90, 1,
     '{"html": "<p><b>Q3 revenue up 18%</b></p><p><i>Driven by enterprise renewals.</i></p><p><span style=\\"font-size: 20px\\">142 new customers</span></p>"}'),
    (2, 'chart', 2, 2, 96, 96, 1,
     '{"chartType": "bar", "title": "Monthly Revenue (k)", "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], "values": [120, 150, 170, 140, 190, 210]}'),
    (3, 'chart', 2, 2, 96, 96, 1,
     '{"chartType": "line", "title": "Daily Visitors", "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "values": [820, 932, 901, 934, 1290, 1330, 1320]}'),
    (4, 'image', 5, 5, 90, 90, 1,
     '{"imageUrl": "/assets/images/sample-banner.svg", "altText": "Sample brand banner"}');
