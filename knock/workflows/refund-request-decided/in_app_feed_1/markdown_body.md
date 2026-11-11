{% if outcome == "approved" %}Your refund request for **{{ courseTitle }}** was approved.{% else %}Your refund request for **{{ courseTitle }}** was declined.{% endif %}{% if note %}

> {{ note }}{% endif %}