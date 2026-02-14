using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CustomControls
{
    public sealed partial class WindowCurveVisor : UserControl
    {
        private ObservableCollection<Function> Curves => Visor.Curves;
        public ScaleParameters ScaleParams => Visor.ScaleParams;

        public string VerticalQuantity { get; set; }
        public string HorizontalQuantity { get; set; }

        public WindowCurveVisor()
        {
            this.InitializeComponent();
        }

        public WindowCurveVisor(string verticalQuantity, string horizontalQuantity)
        {
            this.InitializeComponent();
            Visor.verticalQuantity = verticalQuantity;
            Visor.horizontalQuantity = horizontalQuantity;
        }

        private async void CurveLibraryClick(object sender, TappedRoutedEventArgs e)
        {
            var curveSelector = new CurveSelection(Curves.ToList());

            var dialog = new ContentDialog()
            {
                Title = "Select curves you want to display",
                Content = curveSelector,
                PrimaryButtonText = "OK",
                CloseButtonText = "Cancel",
            };

            var result = await dialog.ShowAsync();

            if (result == ContentDialogResult.Primary)
            {
                foreach (var curve in curveSelector.selectedCurves())
                {
                    if (curve.FunctionQuantity == VerticalQuantity)
                        if (!Curves.Contains(curve)) Curves.Add(curve);
                }

                var toDelete = new List<Function>();

                foreach (var curve in Curves)
                    if (!curveSelector.selectedCurves().Contains(curve))
                        toDelete.Add(curve);

                foreach (var curve in toDelete)
                    Curves.Remove(curve);
            }
        }

        private void ScaleParametersClick(object sender, TappedRoutedEventArgs e)
        {
            this.Content = new GraphScaleSettings(this, (ScaleParameters)Visor.ScaleParams.Clone(), VerticalQuantity);

        }

        public void acceptScaleChanges(ScaleParameters newParams)
        {
            Visor.ScaleParams = newParams;
            this.Content = grdCurveDisplay;
        }

        public void cancelScaleChanges()
        {
            this.Content = grdCurveDisplay;
        }
    }
}
