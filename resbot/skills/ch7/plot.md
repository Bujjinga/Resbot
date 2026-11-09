# Plot / image analysis (`/resbot:ch7 plot <n>`)

Text before pixels. Screenshot only when the printed numbers do not answer the question.

1. Read `outputs/cell_NN.md` and the cell's printed numbers first (the plot cell should print them).
2. If an image is still needed: scroll cell n into view, take ONE screenshot, then zoom to the plot region.
3. Look for, by plot type:
   - **Loss/metric curves:** divergence, train/val gap (overfit), plateaus, LR-schedule kinks, noisy val.
   - **Confusion matrix:** which classes are confused, asymmetric errors, a class never predicted.
   - **Sample / augmentation grids:** label noise, wrong crops, augmentations destroying the signal, data leaks in filenames/overlays.
   - **Grad-CAM / saliency:** shortcut learning (watermarks, borders, text, background).
   - **Class distribution:** imbalance ratio, missing classes in a split.
4. Save findings as TEXT in `outputs/cell_NN.md` (≤10 lines total) and update `cell_tree.md` key result.
5. If a finding changes the plan, add an idea to `notes/ideas.md` or a hypothesis to `notes/hypotheses.md`.

Plot cells must also `print()` the key numbers (final losses, per-class counts, top confusions) so
next time no screenshot is needed.
