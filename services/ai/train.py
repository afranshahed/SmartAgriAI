import argparse
import json
from pathlib import Path

import tensorflow as tf


def parse_args():
    parser = argparse.ArgumentParser(description="Train PlantVillage disease classifier.")
    parser.add_argument("--data-dir", default="data/PlantVillage", help="Directory with class subfolders.")
    parser.add_argument("--model-dir", default="models", help="Output directory for model artifacts.")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--validation-split", type=float, default=0.2)
    return parser.parse_args()


def build_model(image_size: int, class_count: int):
    inputs = tf.keras.Input(shape=(image_size, image_size, 3))
    base = tf.keras.applications.MobileNetV2(
        include_top=False,
        input_tensor=inputs,
        weights="imagenet",
    )
    base.trainable = False

    x = tf.keras.layers.RandomFlip("horizontal")(inputs)
    x = tf.keras.layers.RandomRotation(0.08)(x)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(class_count, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0005),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    model_dir = Path(args.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    if not data_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {data_dir}")

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=args.validation_split,
        subset="training",
        seed=42,
        image_size=(args.image_size, args.image_size),
        batch_size=args.batch_size,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=args.validation_split,
        subset="validation",
        seed=42,
        image_size=(args.image_size, args.image_size),
        batch_size=args.batch_size,
    )

    labels = train_ds.class_names
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)

    model = build_model(args.image_size, len(labels))
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(model_dir / "plant_disease_model.keras"),
            monitor="val_accuracy",
            save_best_only=True,
        ),
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True),
    ]

    history = model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)
    model.save(model_dir / "plant_disease_model.keras")
    (model_dir / "labels.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")
    (model_dir / "training_history.json").write_text(json.dumps(history.history, indent=2), encoding="utf-8")

    print(f"Saved model and labels to {model_dir}")


if __name__ == "__main__":
    main()
